import * as vscode from "vscode";

export const space = {
  0: "0px",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.5rem",
  6: "2rem",
  7: "3rem",
};

export const colors = {
  foreground: "var(--vscode-foreground)",
  editor: {
    background: "var(--vscode-editor-background)",
  },
  description: { foreground: "var(--vscode-descriptionForeground)" },
  icon: { foreground: "var(--vscode-icon-foreground)" },
  window: {
    activeBorder: "var(--vscode-window-activeBorder)",
    inactiveBorder: "var(--vscode-window-inactiveBorder)",
  },
  button: {
    background: "var(--vscode-button-background)",
    foreground: "var(--vscode-button-foreground)",
    hoverBackground: "var(--vscode-button-hoverBackground)",
    secondaryForeground: "var(--vscode-button-secondaryForeground)",
    secondaryBackground: "var(--vscode-button-secondaryBackground)",
    secondaryHoverBackground: "var(--vscode-button-secondaryHoverBackground)",
  },
  checkbox: {
    foreground: "var(--vscode-checkbox-foreground)",
    background: "var(--vscode-checkbox-background)",
    border: "var(--vscode-checkbox-border)",
  },
  dropdown: {
    background: "var(--vscode-dropdown-background)",
    listBackground: "var(--vscode-dropdown-listBackground)",
    border: "var(--vscode-dropdown-border)",
    foreground: "var(--vscode-dropdown-foreground)",
  },
  input: {
    background: "var(--vscode-input-background)",
    border: "var(--vscode-input-border)",
    foreground: "var(--vscode-input-foreground)",
    placeholderForeground: "var(--vscode-input-placeholderForeground)",
  },
  badge: {
    background: "var(--vscode-badge-background)",
    foreground: "var(--vscode-badge-foreground)",
  },
  list: {
    activeSelectionBackground: "var(--vscode-list-activeSelectionBackground)",
    activeSelectionForeground: "var(--vscode-list-activeSelectionForeground)",
    hoverBackground: "var(--vscode-list-hoverBackground)",
    hoverForeground: "var(--vscode-list-hoverForeground)",
  },
  activityBar: {
    background: "var(--vscode-activityBar-background)",
    foreground: "var(--vscode-activityBar-foreground)",
    border: "var(--vscode-activityBar-border)",
    activeBorder: "var(--vscode-activityBar-activeBorder)",
  },
  sideBar: {
    background: "var(--vscode-sideBar-background)",
    foreground: "var(--vscode-sideBar-foreground)",
  },
  panelSection: {
    border: "var(--vscode-panelSection-border)",
  },
  sideBarTitle: {
    background: "var(--vscode-sideBarTitle-background)",
    foreground: "var(--vscode-sideBarTitle-foreground)",
  },
  sideBarSectionHeader: {
    background: "var(--vscode-sideBarSectionHeader-background)",
    foreground: "var(--vscode-sideBarSectionHeader-foreground)",
    border: "var(--vscode-sideBarSectionHeader-border)",
  },
  terminal: {
    background: "var(--vscode-terminal-background)",
    foreground: "var(--vscode-terminal-foreground)",
    ansiBlue: "var(--vscode-terminal-ansiBlue)",
    ansiMagenta: "var(--vscode-terminal-ansiMagenta)",
    ansiYellow: "var(--vscode-terminal-ansiYellow)",
  },
};

export const size = {};

export const getVariableValue = (variable: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(
    `--vscode-${variable}`
  );
