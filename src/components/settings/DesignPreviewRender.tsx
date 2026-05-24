import React from "react";

export interface DesignPreviewStyles {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  brand: string;
  brandHover: string;
  border: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  buttonRadius: string;
  cardRadius: string;
  inputRadius: string;
  shadowCard: string;
  shadowHover: string;
  fontFamily: string;
  buttonPadding: string;
}

interface DesignPreviewRenderProps {
  styles: DesignPreviewStyles;
  name: string;
}

export const DesignPreviewRender: React.FC<DesignPreviewRenderProps> = ({ styles, name }) => {
  const isDark = hexBrightness(styles.background) < 60;
  const labelColor = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";

  return (
    <div
      style={{
        backgroundColor: styles.background,
        fontFamily: styles.fontFamily,
        borderRadius: "10px",
        padding: "14px 12px",
        minWidth: "200px",
        border: `1px solid ${styles.border}`,
        boxShadow: styles.shadowCard,
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
        <span
          style={{
            color: labelColor,
            fontSize: "8px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {name}
        </span>
      </div>

      <div
        style={{
          backgroundColor: styles.surface,
          borderRadius: styles.cardRadius,
          border: `1px solid ${styles.border}`,
          boxShadow: styles.shadowCard,
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <div
          style={{
            color: styles.textPrimary,
            fontSize: "12px",
            fontWeight: 600,
            lineHeight: 1.3,
          }}
        >
          Dashboard Overview
        </div>
        <div
          style={{
            color: styles.textSecondary,
            fontSize: "9px",
            lineHeight: 1.5,
          }}
        >
          Your project metrics and recent activity at a glance.
        </div>

        <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "2px" }}>
          <span
            style={{
              backgroundColor: styles.success + "18",
              color: styles.success,
              fontSize: "8px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "99px",
              border: `1px solid ${styles.success}33`,
            }}
          >
            Active
          </span>
          <span
            style={{
              backgroundColor: styles.accent + "18",
              color: styles.accent,
              fontSize: "8px",
              fontWeight: 600,
              padding: "2px 6px",
              borderRadius: "99px",
              border: `1px solid ${styles.accent}33`,
            }}
          >
            v2.1.0
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <input
          type="text"
          placeholder="Email address"
          disabled
          style={{
            flex: 1,
            backgroundColor: styles.surface,
            border: `1px solid ${styles.border}`,
            borderRadius: styles.inputRadius,
            padding: "5px 8px",
            fontSize: "9px",
            fontFamily: styles.fontFamily,
            color: styles.textSecondary,
            outline: "none",
            minWidth: 0,
          }}
        />
        <button
          style={{
            backgroundColor: styles.brand,
            color: isDark ? styles.background : "#FFFFFF",
            border: "none",
            borderRadius: styles.buttonRadius,
            padding: "5px 10px",
            fontSize: "9px",
            fontWeight: 600,
            fontFamily: styles.fontFamily,
            cursor: "pointer",
            whiteSpace: "nowrap",
            boxShadow: isDark ? `0 1px 3px rgba(0,0,0,0.3)` : "none",
          }}
        >
          Subscribe
        </button>
      </div>
    </div>
  );
};

function hexBrightness(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
}
