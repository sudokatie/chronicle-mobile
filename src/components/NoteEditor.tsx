import React, { useRef, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Text,
  useColorScheme,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';

interface NoteEditorProps {
  content: string;
  onChange: (content: string) => void;
  onSave: () => void;
  showPreview: boolean;
}

interface ToolbarButton {
  label: string;
  icon: string;
  action: () => void;
}

/**
 * Markdown editor component with formatting toolbar.
 * Supports common markdown formatting shortcuts.
 */
export function NoteEditor({
  content,
  onChange,
  onSave,
  showPreview,
}: NoteEditorProps): React.ReactElement {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const inputRef = useRef<TextInput>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  const updateSelection = useCallback((event: { nativeEvent: { selection: { start: number; end: number } } }) => {
    selectionRef.current = event.nativeEvent.selection;
  }, []);

  const wrapSelection = useCallback(
    (prefix: string, suffix: string = prefix) => {
      const { start, end } = selectionRef.current;
      const before = content.slice(0, start);
      const selected = content.slice(start, end);
      const after = content.slice(end);

      const newContent = `${before}${prefix}${selected}${suffix}${after}`;
      onChange(newContent);

      // Move cursor after the inserted text
      setTimeout(() => {
        inputRef.current?.setNativeProps({
          selection: {
            start: start + prefix.length,
            end: end + prefix.length,
          },
        });
      }, 0);
    },
    [content, onChange]
  );

  const insertAtCursor = useCallback(
    (text: string) => {
      const { start, end } = selectionRef.current;
      const before = content.slice(0, start);
      const after = content.slice(end);

      const newContent = `${before}${text}${after}`;
      onChange(newContent);

      setTimeout(() => {
        const newPos = start + text.length;
        inputRef.current?.setNativeProps({
          selection: { start: newPos, end: newPos },
        });
      }, 0);
    },
    [content, onChange]
  );

  const insertLinePrefix = useCallback(
    (prefix: string) => {
      const { start } = selectionRef.current;
      // Find the start of the current line
      const lineStart = content.lastIndexOf('\n', start - 1) + 1;
      const before = content.slice(0, lineStart);
      const after = content.slice(lineStart);

      const newContent = `${before}${prefix}${after}`;
      onChange(newContent);

      setTimeout(() => {
        const newPos = start + prefix.length;
        inputRef.current?.setNativeProps({
          selection: { start: newPos, end: newPos },
        });
      }, 0);
    },
    [content, onChange]
  );

  const toolbarButtons: ToolbarButton[] = [
    { label: 'Bold', icon: 'B', action: () => wrapSelection('**') },
    { label: 'Italic', icon: 'I', action: () => wrapSelection('*') },
    { label: 'Code', icon: '<>', action: () => wrapSelection('`') },
    { label: 'Link', icon: '[]', action: () => wrapSelection('[', '](url)') },
    { label: 'H1', icon: 'H1', action: () => insertLinePrefix('# ') },
    { label: 'H2', icon: 'H2', action: () => insertLinePrefix('## ') },
    { label: 'List', icon: '-', action: () => insertLinePrefix('- ') },
    { label: 'Task', icon: '[]', action: () => insertLinePrefix('- [ ] ') },
    { label: 'Quote', icon: '>', action: () => insertLinePrefix('> ') },
  ];

  const backgroundColor = isDark ? '#09090b' : '#ffffff';
  const textColor = isDark ? '#fafafa' : '#09090b';
  const borderColor = isDark ? '#27272a' : '#e4e4e7';
  const toolbarBg = isDark ? '#18181b' : '#f4f4f5';
  const buttonBg = isDark ? '#27272a' : '#ffffff';
  const buttonText = isDark ? '#a1a1aa' : '#52525b';

  if (showPreview) {
    return <View />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Formatting Toolbar */}
      <View style={[styles.toolbar, { backgroundColor: toolbarBg, borderBottomColor: borderColor }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.toolbarContent}
        >
          {toolbarButtons.map((button) => (
            <TouchableOpacity
              key={button.label}
              style={[styles.toolbarButton, { backgroundColor: buttonBg }]}
              onPress={button.action}
              accessibilityLabel={button.label}
            >
              <Text style={[styles.toolbarButtonText, { color: buttonText }]}>
                {button.icon}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Editor */}
      <ScrollView style={styles.editorScroll} keyboardDismissMode="interactive">
        <TextInput
          ref={inputRef}
          style={[
            styles.editor,
            {
              backgroundColor,
              color: textColor,
            },
          ]}
          value={content}
          onChangeText={onChange}
          onSelectionChange={updateSelection}
          onBlur={onSave}
          multiline
          textAlignVertical="top"
          placeholder="Start writing..."
          placeholderTextColor={isDark ? '#52525b' : '#a1a1aa'}
          autoCapitalize="sentences"
          autoCorrect
          spellCheck
          scrollEnabled={false}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toolbar: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  toolbarContent: {
    paddingHorizontal: 12,
    gap: 8,
    flexDirection: 'row',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    minWidth: 40,
    alignItems: 'center',
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  editorScroll: {
    flex: 1,
  },
  editor: {
    flex: 1,
    padding: 16,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    minHeight: 400,
  },
});
