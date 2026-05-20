import { mkdir, writeFile } from "fs/promises";
import * as path from "path";

export type PipelineType = "node-ci" | "docker-deploy" | "cvr-agent" | "static-deploy";
export type DeployTarget = "github-pages" | "vercel" | "cloudflare" | "docker-hub" | "custom";

export interface CIConfig {
  pipelineType: PipelineType;
  projectName: string;
  nodeVersion?: string;
  buildCommand?: string;
  testCommand?: string;
  lintCommand?: string;
  typeCheckCommand?: string;
  deployTarget?: DeployTarget;
  dockerfile?: string;
  customSteps?: string;
}

export interface CIResult {
  files: string[];
  pipelineType: string;
  path: string;
}

const WORKFLOW_DIR = ".github/workflows";

async function ensureWorkflowDir(): Promise<string> {
  const dir = path.join(process.cwd(), WORKFLOW_DIR);
  await mkdir(dir, { recursive: true });
  return dir;
}

function generateNodeCIWorkflow(config: CIConfig): string {
  const nodeVer = config.nodeVersion || "20";
  const buildCmd = config.buildCommand || "npm run build";
  const testCmd = config.testCommand || "npm test";
  const lintCmd = config.lintCommand || "";
  const typeCmd = config.typeCheckCommand || "";

  return `name: CI - ${config.projectName}

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [${nodeVer}]

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci${lintCmd ? `\n\n      - name: Lint\n        run: ${lintCmd}` : ""}${typeCmd ? `\n\n      - name: Type Check\n        run: ${typeCmd}` : ""}

      - name: Test
        run: ${testCmd}

      - name: Build
        run: ${buildCmd}
`;
}

function generateDockerDeployWorkflow(config: CIConfig): string {
  const dockerfile = config.dockerfile || "Dockerfile";
  const target = config.deployTarget || "docker-hub";
  const imageName = config.projectName.toLowerCase().replace(/\s+/g, "-");

  let deploySteps = "";
  switch (target) {
    case "docker-hub":
      deploySteps = `
      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKER_USERNAME }}
          password: \${{ secrets.DOCKER_PASSWORD }}

      - name: Push Docker image
        run: docker push ${imageName}:latest`;
      break;
    case "github-pages":
      deploySteps = `
      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist`;
      break;
    case "vercel":
      deploySteps = `
      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}`;
      break;
    case "cloudflare":
      deploySteps = `
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy dist --project-name=${imageName}`;
      break;
  }

  return `name: Docker Deploy - ${config.projectName}

on:
  push:
    branches: [main, master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Build Docker image
        run: docker build -t ${imageName} -f ${dockerfile} .
${deploySteps}
`;
}

function generateCVRAgentWorkflow(config: CIConfig): string {
  return `name: CVR Agent - ${config.projectName}

on:
  issues:
    types: [opened, labeled]
  issue_comment:
    types: [created]
  pull_request:
    types: [opened, synchronize]

jobs:
  cvr-agent:
    if: |
      (github.event_name == 'issues' && github.event.action == 'opened') ||
      (github.event_name == 'issue_comment' && contains(github.event.comment.body, '/cvr')) ||
      (github.event_name == 'pull_request' && github.event.action == 'opened')
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${config.nodeVersion || "20"}
        uses: actions/setup-node@v4
        with:
          node-version: ${config.nodeVersion || "20"}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run CVR Agent
        env:
          GEMINI_API_KEY: \${{ secrets.GEMINI_API_KEY }}
          OPENAI_API_KEY: \${{ secrets.OPENAI_API_KEY }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
          GH_TOKEN: \${{ secrets.GITHUB_TOKEN }}
          CVR_CI_MODE: "true"
        run: |
          npx tsx server.ts &
          sleep 5
          curl -s http://localhost:3000/api/health
${config.customSteps || ""}
`;
}

function generateStaticDeployWorkflow(config: CIConfig): string {
  const buildCmd = config.buildCommand || "npm run build";
  const target = config.deployTarget || "github-pages";
  const publishDir = config.projectName.includes("dist") ? config.projectName : "dist";

  let deploySteps = "";
  switch (target) {
    case "github-pages":
      deploySteps = `      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v4
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./${publishDir}`;
      break;
    case "vercel":
      deploySteps = `      - name: Deploy to Vercel
        run: npx vercel --prod --token \${{ secrets.VERCEL_TOKEN }}`;
      break;
    case "cloudflare":
      deploySteps = `      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: \${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: pages deploy ${publishDir}`;
      break;
  }

  return `name: Deploy - ${config.projectName}

on:
  push:
    branches: [main, master]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js ${config.nodeVersion || "20"}
        uses: actions/setup-node@v4
        with:
          node-version: ${config.nodeVersion || "20"}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: ${buildCmd}

${deploySteps}
`;
}

export async function generateCIPipeline(config: CIConfig): Promise<CIResult> {
  const dir = await ensureWorkflowDir();
  let content: string;
  let filename: string;

  switch (config.pipelineType) {
    case "node-ci":
      content = generateNodeCIWorkflow(config);
      filename = "ci.yml";
      break;
    case "docker-deploy":
      content = generateDockerDeployWorkflow(config);
      filename = "docker-deploy.yml";
      break;
    case "cvr-agent":
      content = generateCVRAgentWorkflow(config);
      filename = "cvr-agent.yml";
      break;
    case "static-deploy":
      content = generateStaticDeployWorkflow(config);
      filename = "deploy.yml";
      break;
    default:
      throw new Error(`Unknown pipeline type: ${config.pipelineType}`);
  }

  await writeFile(path.join(dir, filename), content, "utf-8");

  return {
    files: [path.join(WORKFLOW_DIR, filename)],
    pipelineType: config.pipelineType,
    path: dir,
  };
}

export const PIPELINE_TEMPLATES: Array<{ type: PipelineType; name: string; description: string }> = [
  { type: "node-ci", name: "Node.js CI", description: "Type-check, lint, test, and build on push/PR" },
  { type: "docker-deploy", name: "Docker Build & Deploy", description: "Build Docker image and push to registry" },
  { type: "cvr-agent", name: "CVR Agent in CI", description: "Run CVR coding agent on issues/PRs" },
  { type: "static-deploy", name: "Static Site Deploy", description: "Build static site and deploy (Pages/Vercel/Cloudflare)" },
];
