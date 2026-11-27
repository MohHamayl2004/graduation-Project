import { forwardRef, useImperativeHandle, useLayoutEffect, useRef } from "react";
import { MathfieldElement } from "mathlive";
import "mathlive/fonts.css";
import { mathSegments } from "../mathContent";

// Bundle fonts locally and disable MathLive's optional sound downloads.
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;

const RTL_FIELD_STYLE = ".ML__container, .ML__content, .ML__latex { direction: rtl !important; } span:has(> .ML__sqrt-sign) { display: inline-flex !important; flex-direction: row-reverse; direction: ltr; } span:has(> .ML__sqrt-sign) > .ML__vlist-t { direction: rtl; } .ML__sqrt-sign, .ML__op-symbol { display: inline-block; transform: scaleX(-1); }";

// A key typed on an English layout still gives the textbook's digit.
const arabicDigit = (key) => "٠١٢٣٤٥٦٧٨٩"[Number(key)];
const isPlainKey = (event, pattern) => pattern.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey;

// An unfilled slot is not part of the question.
const syncField = (field) => { field.dataset.latex = field.getValue("latex-without-placeholders"); };
const cleanText = (text) => text.replace(/\u200b/g, "").replace(/\u00a0/g, " ");
function serialize(node) {
  if (node.nodeType === Node.TEXT_NODE) return cleanText(node.textContent);
  if (node.nodeName === "MATH-FIELD") {
    const latex = node.dataset.latex ?? node.value;
    return latex ? `\\(${latex}\\)` : "";
  }
  if (node.nodeName === "BR") return "\n";
  const content = [...node.childNodes].map(serialize).join("");
  return /^(DIV|P)$/.test(node.nodeName) && node.previousSibling && !node.classList.contains("tutor-rich-input") ? `\n${content}` : content;
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
    field.dir = "rtl";
    field.shadowRoot.append(Object.assign(document.createElement("style"), { textContent: RTL_FIELD_STYLE }));
    // The equation runs right to left, so the arrow keys follow what the student sees.
    field.addEventListener("mount", () => { field.keybindings = [...field.keybindings.filter(({ key }) => key !== "left" && key !== "right"), { key: "left", command: "moveToNextChar" }, { key: "right", command: "moveToPreviousChar" }]; }, { once: true });
    field.setAttribute("aria-label", "معادلة رياضية قابلة للتعديل");
    field.value = latex;
    field.dataset.latex = latex;
    field.readOnly = Boolean(handlers.current.disabled);
    field.addEventListener("input", () => syncField(field));
    field.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        handlers.current.onSubmit();
      }
      if (isPlainKey(event, /^[0-9.]$/)) {
        event.preventDefault();
        event.stopPropagation();
        field.insert(event.key === "." ? "," : arabicDigit(event.key), { selectionMode: "after" });
        syncField(field);
        emit();
      }
      if (event.key === "Backspace" && !field.getValue("latex-without-placeholders")) {
        event.preventDefault();
        event.stopPropagation();
        removeField(field);
      }
    }, true);
    field.addEventListener("beforeinput", (event) => {
      if (event.inputType === "insertLineBreak") { event.preventDefault(); handlers.current.onSubmit(); }
    });
    field.addEventListener("move-out", (event) => {
      event.preventDefault();
      const range = document.createRange();
      const after = atom.nextSibling, before = atom.previousSibling;
      if (["backward", "upward"].includes(event.detail.direction)) {
        if (before?.nodeType === Node.TEXT_NODE) range.setStart(before, before.length);
        else range.setStartBefore(atom);
      } else if (after?.nodeType === Node.TEXT_NODE) range.setStart(after, after.nodeValue.startsWith("\u200b") ? 1 : 0);
      else range.setStartAfter(atom);
      range.collapse(true);
      activeMath.current = null;
      // Once the field has finished handling the key; it keeps the selection until it blurs.
      setTimeout(() => { field.blur(); savedRange.current = range; focus(); });
    });
    atom.append(field);
    return atom;
  };
  const replaceContent = (text) => {
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
  const openField = () => {
    const range = restoreRange();
    if (serialize(editor.current).length - serialize(range.cloneContents()).length + 8 > maxLength) return null;
    range.deleteContents();
    const next = makeField(""), space = document.createTextNode("\u200b");
    range.insertNode(next);
    next.after(space);
    range.setStart(space, 1);
    range.collapse(true);
    savedRange.current = range;
    activeMath.current = next.firstElementChild;
    activeMath.current.focus();
    return activeMath.current;
  };
  const removeField = (field) => {
    const atom = field.parentElement;
    const range = document.createRange();
    range.setStartBefore(atom);
    range.collapse(true);
    if (atom.nextSibling?.nodeValue === "\u200b") atom.nextSibling.remove();
    atom.remove();
    savedRange.current = range;
    activeMath.current = null;
    emit();
    focus();
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
    insertTemplate(template) {
      if (handlers.current.disabled) return false;
      const field = activeMath.current?.isConnected ? activeMath.current : openField();
      if (!field) return false;
      const old = field.value, selection = field.selection;
      field.insert(template.insert, { selectionMode: "placeholder" });
      syncField(field);
      if (serialize(editor.current).length > maxLength) { field.value = old; syncField(field); field.selection = selection; return false; }
      emit();
      field.focus();
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
    document.addEventListener("selectionchange", selection);
    element.addEventListener("focusin", focused);
    return () => {
      document.removeEventListener("selectionchange", selection);
      element.removeEventListener("focusin", focused);
    };
  }, []);

  return <div ref={editor} role="textbox" aria-multiline="true" aria-disabled={disabled || undefined}
    aria-label="سؤالك للمعلّم الذكي" data-placeholder="اسألني عن أي إشي بالمواد" dir="rtl"
    contentEditable={!disabled} suppressContentEditableWarning className="tutor-rich-input"
    onInput={emit} onBlur={saveSelection}
    onKeyDown={(event) => {
      if (isPlainKey(event, /^[0-9]$/) && !event.target.closest("math-field")) {
        event.preventDefault();
        document.execCommand("insertText", false, arabicDigit(event.key));
      }
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
