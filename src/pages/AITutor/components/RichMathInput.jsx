import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";
import { mathSegments } from "../mathContent";

// Bundle fonts locally and disable MathLive's optional sound downloads.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

const cleanText = (text) => text.replace(/\u200b/g, "").replace(/\u00a0/g, " ");
function serialize(node) {
  if (node.nodeType === Node.TEXT_NODE) return cleanText(node.textContent);
  if (node.nodeName === "MATH-FIELD") {
    const latex = node.dataset.latex ?? node.value;
    return latex ? `\\(${latex}\\)` : "";
  }
  if (node.nodeName === "BR") return "\n";
  const content = [...node.childNodes].map(serialize).join("");
  return /^(DIV|P)$/.test(node.nodeName) && node.previousSibling ? `\n${content}` : content;
}

export default forwardRef(function RichMathInput({ value, onChange, onSubmit, disabled, maxLength }, ref) {
  const editor = useRef(null);
  const savedRange = useRef(null);
  const activeMath = useRef(null);
  const accepted = useRef(value);
  const handlers = useRef({ onChange, onSubmit, disabled });
  handlers.current = { onChange, onSubmit, disabled };

  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection?.rangeCount && editor.current.contains(selection.anchorNode) && editor.current.contains(selection.focusNode)) savedRange.current = selection.getRangeAt(0).cloneRange();
  };
  const restoreRange = () => {
    const range = savedRange.current;
    if (range && editor.current.contains(range.startContainer) && editor.current.contains(range.endContainer)) return range;
    const end = document.createRange();
    end.selectNodeContents(editor.current);
    end.collapse(false);
    return end;
  };
  const focus = () => {
    if (activeMath.current?.isConnected) { activeMath.current.focus(); return; }
    editor.current.focus();
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(restoreRange());
  };
  const makeField = (latex) => {
    const atom = document.createElement("span");
    atom.contentEditable = "false";
    atom.className = "tutor-math-atom";
    const field = new MathfieldElement({ mathVirtualKeyboardPolicy: "manual" });
    field.className = "tutor-inline-math";
    field.dir = "ltr";
    field.setAttribute("aria-label", "معادلة رياضية قابلة للتعديل");
    field.value = latex;
    field.dataset.latex = latex;
    field.readOnly = Boolean(handlers.current.disabled);
    field.addEventListener("input", () => { field.dataset.latex = field.value; });
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        handlers.current.onSubmit();
      }
    }, true);
    field.addEventListener("beforeinput", (event) => {
      if (event.inputType === "insertLineBreak") { event.preventDefault(); handlers.current.onSubmit(); }
    });
    field.addEventListener("move-out", (event) => {
      event.preventDefault();
      const range = document.createRange();
      if (["backward", "upward"].includes(event.detail.direction)) range.setStartBefore(atom);
      else range.setStartAfter(atom);
      range.collapse(true);
      savedRange.current = range;
      activeMath.current = null;
      focus();
    });
    atom.append(field);
    return atom;
  };
  const replaceContent = (text) => {
    if (!text) window.mathVirtualKeyboard.hide();
    editor.current.replaceChildren();
    for (const part of mathSegments(text)) {
      editor.current.append(part.type === "math" ? makeField(part.latex) : document.createTextNode(part.text));
      if (part.type === "math") editor.current.append(document.createTextNode("\u200b"));
    }
    savedRange.current = null;
    activeMath.current = null;
  };
  const emit = () => {
    const text = serialize(editor.current);
    if (text.length > maxLength) { replaceContent(accepted.current); return false; }
    accepted.current = text;
    handlers.current.onChange(text);
    saveSelection();
    return true;
  };
  const insertText = (text) => {
    const range = restoreRange();
    range.deleteContents();
    const fragment = document.createDocumentFragment();
    for (const part of mathSegments(text)) {
      fragment.append(part.type === "math" ? makeField(part.latex) : document.createTextNode(part.text));
      if (part.type === "math") fragment.append(document.createTextNode("\u200b"));
    }
    const tail = fragment.lastChild;
    if (tail) { range.insertNode(fragment); range.setStartAfter(tail); }
    range.collapse(true);
    savedRange.current = range;
    activeMath.current = null;
    if (emit()) focus();
  };
  const copySelection = (event, cut = false) => {
    if (event.target.closest("math-field")) return;
    const selection = window.getSelection();
    if (!selection?.rangeCount || selection.isCollapsed) return;
    event.preventDefault();
    const range = selection.getRangeAt(0);
    event.clipboardData.setData("text/plain", serialize(range.cloneContents()));
    if (cut) { range.deleteContents(); savedRange.current = range; activeMath.current = null; emit(); }
  };

  useImperativeHandle(ref, () => ({
    focus,
    closest: (selector) => editor.current.closest(selector),
    insertMath(symbol) {
      if (handlers.current.disabled) return false;
      const field = activeMath.current;
      if (field?.isConnected) {
        const old = field.value, selection = field.selection;
        field.insert(symbol.latex, { selectionMode: "after" });
        field.dataset.latex = field.value;
        if (serialize(editor.current).length > maxLength) { field.value = old; field.dataset.latex = old; field.selection = selection; return false; }
        emit();
        return true;
      }
      const range = restoreRange();
      const selected = serialize(range.cloneContents());
      if (serialize(editor.current).length - selected.length + symbol.latex.length + 4 > maxLength) return false;
      range.deleteContents();
      const next = makeField(symbol.latex), space = document.createTextNode("\u200b");
      range.insertNode(next);
      next.after(space);
      range.setStart(space, 1);
      range.collapse(true);
      savedRange.current = range;
      activeMath.current = next.firstElementChild;
      emit();
      return true;
    }
  }));

  useLayoutEffect(() => {
    if (value !== serialize(editor.current)) replaceContent(value);
    accepted.current = value;
    editor.current.querySelectorAll("math-field").forEach((field) => { field.readOnly = Boolean(disabled); });
  }, [value, disabled]);
  useLayoutEffect(() => {
    const selection = () => saveSelection();
    const element = editor.current;
    const focused = (event) => { activeMath.current = event.target.closest("math-field"); };
    const keyboard = window.mathVirtualKeyboard;
    const composer = element.closest(".chat-composer");
    const keyboardSize = () => composer.style.setProperty("--tutor-math-keyboard-space", `${keyboard.boundingRect.height}px`);
    document.addEventListener("selectionchange", selection);
    element.addEventListener("focusin", focused);
    keyboard.addEventListener("geometrychange", keyboardSize);
    return () => {
      document.removeEventListener("selectionchange", selection);
      element.removeEventListener("focusin", focused);
      keyboard.removeEventListener("geometrychange", keyboardSize);
      keyboard.hide();
      composer.style.removeProperty("--tutor-math-keyboard-space");
    };
  }, []);

  return <div ref={editor} role="textbox" aria-multiline="true" aria-disabled={disabled || undefined}
    aria-label="سؤالك للمعلّم الذكي" data-placeholder="اسألني عن أي إشي بالمواد" dir="auto"
    contentEditable={!disabled} suppressContentEditableWarning className="tutor-rich-input"
    onInput={emit} onBlur={saveSelection}
    onKeyDown={(event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
        event.preventDefault();
        handlers.current.onSubmit();
      }
    }}
    onPaste={(event) => {
      if (event.target.closest("math-field")) return;
      event.preventDefault();
      insertText(event.clipboardData.getData("text/plain"));
    }}
    onCopy={copySelection}
    onCut={(event) => copySelection(event, true)}
    onDrop={(event) => event.preventDefault()}
  />;
});
