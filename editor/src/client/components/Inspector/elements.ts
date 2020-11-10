import styled from "styled-components";
import { colors } from "../../../common/design-tokens";

export const Wrapper = styled.div({
  fontFamily: "'Source Code Pro', monospace",
  fontSize: 16,
  lineHeight: "24px",
  color: colors.gray[100],
});

export const SmallWrapper = styled.div({
  fontFamily: "'Source Code Pro', monospace",
  fontSize: 12,
  lineHeight: "16px",
});

export const Key = styled.span({
  marginRight: 5,
  color: colors.gray[100],
  cursor: "pointer",
  ":hover": {
    opacity: 0.75,
  },
});

export const InlineNested = styled.div({
  display: "flex",
  alignItems: "center",
  cursor: "pointer",
});

export const Bracket = styled.div<{ pointer: boolean }>((props) => ({
  display: "flex",
  alignItems: "center",
  cursor: props.pointer ? "pointer" : "default",
}));

export const StringValue = styled.div({
  display: "flex",
  alignItems: "center",
  color: colors.yellow[400],
});

export const OtherValue = styled.div({
  display: "flex",
  alignItems: "center",
  color: colors.purple[400],
});

export const ClassInstanceLabel = styled.div({
  display: "flex",
  alignItems: "center",
  color: colors.purple[400],
  cursor: "pointer",
  ":hover": {
    opacity: 0.9,
  },
});

export const InlineClass = styled.span({
  color: colors.purple[400],
  marginRight: "0.5rem",
});

export const GenericValue = styled.div({
  display: "flex",
  alignItems: "center",
  color: colors.blue[400],
});

export const NestedChildren = styled.div({
  paddingLeft: "1rem",
});

export const KeyCount = styled.span({
  fontsize: 14,
  color: "var(--input.foreground)",
});

export const EditValueWrapper = styled.span({
  position: "relative",
});

export const EditValuePopup = styled.div({
  position: "absolute",
  width: 400,
  height: 100,
  top: 0,
  left: 0,
  boxShadow: "0px 10px 13px 0px rgba(0,0,0,0.1)",
});

export const NewState = styled.textarea({
  fontFamily: "inherit",
  fontSize: 16,
  border: "2px solid transparent",
  backgroundColor: "var(--input.background)",
  color: "var(--input.foreground)",
  outline: "none",
  borderRadius: 3,
  width: "100%",
  height: "100%",
  boxSizing: "border-box",
});

export const Ok = styled.span({
  position: "absolute",
  cursor: "pointer",
  top: 0,
  right: 0,
  fontSize: 10,
  border: 0,
  outline: "none",
  padding: "0.25rem 0.5rem",
  opacity: 0.5,
  color: "var(--input.background)",
});
