import { useState } from "react";
import { Menu, Settings as SettingsIcon, X } from "lucide-react";
import { TRANSLATIONS } from "./i18n";
import { ChatContainer } from "./components/chat/ChatContainer";
import { SettingsModal } from "./components/settings/SettingsModal";
import { Sidebar } from "./components/sidebar/Sidebar";
import { useSettings } from "./hooks/useSettings";
import { useChat } from "./hooks/useChat";
import { useMemory } from "./hooks/useMemory";
import type { Skill } from "./components/sidebar/SkillsPanel";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<"memory" | "skills">("memory");
  const [input, setInput] = useState("");
  const [lang, setLang] = useState<"en" | "ru" | "es" | "zh" | "de" | "fr" | "pt" | "it" | "ja" | "ko" | "ar" | "tr" | "pl" | "uk" | "vi" | "hi">(() => {
    const saved = localStorage.getItem("cvr_lang");
    const validLangs = ["en", "ru", "es", "zh", "de", "fr", "pt", "it", "ja", "ko", "ar", "tr", "pl", "uk", "vi", "hi"];
    return validLangs.includes(saved || "") ? (saved as any) : "en";
  });

  const { settings, updateChatConfig } = useSettings();
  const { messages, isLoading, sendMessage, cancelMessage } = useChat(settings.chat);
  const { memories } = useMemory();

  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;

  const handleSendMessage = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleCancelMessage = () => {
    cancelMessage();
  };

  const handleInputChange = (value: string) => {
    setInput(value);
  };

  const handleSaveSettings = (chatConfig: any) => {
    updateChatConfig(chatConfig);
  };

  const handleLanguageChange = (newLang: string) => {
    setLang(newLang as any);
    localStorage.setItem("cvr_lang", newLang);
  };

  const handleLearnSkill = (skillId: string) => {
    console.log("Learn skill:", skillId);
  };

  const activeAgent = "build";
  const agentsList = [
    { id: "build", label: "BUILD", color: "text-dash-accent", icon: SettingsIcon },
  ];

  const learnedSkills: Skill[] = [
    {
      id: "skill1",
      name: "Code Analysis",
      description: "Analyze code patterns",
      icon: SettingsIcon,
      status: "learned",
      category: "research",
    },
  ];

  const availableSkills: Skill[] = [
    {
      id: "skill2",
      name: "API Design",
      description: "Design REST APIs",
      icon: SettingsIcon,
      status: "available",
      category: "devops",
    },
  ];

  const skills = [...learnedSkills, ...availableSkills];

  return (
    <div className="h-screen w-screen bg-dash-bg text-dash-text-primary overflow-hidden flex flex-col">
      {/* Top Header */}
      <header className="flex items-center justify-between px-2 md:px-3 py-0.5 bg-dash-header border-b border-dash-border shrink-0">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="md:hidden p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          {showSidebar && (
            <button
              onClick={() => setShowSidebar(false)}
              className="hidden md:block p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 cursor-default select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-dash-success animate-pulse" aria-hidden="true" />
              <span className="text-[11px] font-mono text-dash-text-muted uppercase tracking-wider">
                cvr
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-dash-text-muted">
            <span className="flex items-center gap-1 opacity-70">
              <span className="w-2 h-2 bg-dash-success rounded-full" aria-hidden="true" /> {t.engineStable}
            </span>
            <span className="flex items-center gap-1 opacity-70">
              <span className="w-2 h-2 bg-dash-accent rounded-full" aria-hidden="true" /> {memories.length}
            </span>
          </div>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 hover:bg-neutral-800 rounded transition-colors text-dash-text-muted"
          >
            <SettingsIcon className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar
          isOpen={showSidebar}
          activeTab={sidebarTab}
          onTabChange={setSidebarTab}
          memories={memories}
          skills={skills}
          onLearnSkill={handleLearnSkill}
          lang={lang}
          t={t}
        />

        {/* Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatContainer
            messages={messages}
            input={input}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onCancelMessage={handleCancelMessage}
            isLooming={isLoading}
            agentLabel={agentsList.find((a) => a.id === activeAgent)?.label}
            t={t}
            lang={lang}
            loadingText={t.processing}
            placeholder={t.promptPlaceholder}
          />
        </div>
      </main>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={settings.chat}
        kernelConfig={settings.chat}
        presets={settings.presets}
        onSave={handleSaveSettings}
        onPresetSave={(preset) => console.log("Save preset:", preset)}
        onPresetApply={(preset) => console.log("Apply preset:", preset)}
        onPresetDelete={(id) => console.log("Delete preset:", id)}
        onLanguageChange={handleLanguageChange}
        t={t}
        lang={lang}
      />
    </div>
  );
}
