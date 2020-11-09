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

/*

		"terminal.ansiMagenta": "",
		"terminal.ansiYellow": "#e7ee98",
*/

export const colors = {
  foreground1: "#f6f6f4",
  foreground2: "#ffffff",
  foreground3: "#c5c5c5",
  foreground4: "#f6f6f4b3",
  background1: "#282a36",
  background2: "#44475a",
  background2Hover: "#52556c",
  background3: "#3a3d41",
  background3Hover: "#45494e",
  background4: "#343746",
  background5: "#262626",
  border1: "#191a21",
  border2: "#f286c480",
  border3: "#bf9eee",
  placeholderForeground: "#7b7f8b",
  magenta: "#f286c4",
  yellow: "#e7ee98",
  blue: "#bf9eee",
};

export const size = {};

export const getVariableValue = (variable: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(`--${variable}`);
