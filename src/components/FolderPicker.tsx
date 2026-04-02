import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface FolderPickerProps {
  folders: string[];
  selectedFolder: string | undefined;
  onSelect: (folder: string | undefined) => void;
}

export function FolderPicker({ folders, selectedFolder, onSelect }: FolderPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelect = (folder: string | undefined) => {
    onSelect(folder);
    setModalVisible(false);
  };

  const displayText = selectedFolder || 'All Notes';

  return (
    <>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="folder-outline" size={16} color="#007AFF" />
        <Text style={styles.pickerText} numberOfLines={1}>
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#007AFF" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Folder</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[
                styles.optionRow,
                !selectedFolder && styles.optionRowSelected,
              ]}
              onPress={() => handleSelect(undefined)}
            >
              <Ionicons
                name="albums-outline"
                size={20}
                color={!selectedFolder ? '#007AFF' : '#666'}
              />
              <Text
                style={[
                  styles.optionText,
                  !selectedFolder && styles.optionTextSelected,
                ]}
              >
                All Notes
              </Text>
              {!selectedFolder && (
                <Ionicons name="checkmark" size={20} color="#007AFF" />
              )}
            </TouchableOpacity>

            <FlatList
              data={folders}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionRow,
                    selectedFolder === item && styles.optionRowSelected,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Ionicons
                    name="folder-outline"
                    size={20}
                    color={selectedFolder === item ? '#007AFF' : '#666'}
                  />
                  <Text
                    style={[
                      styles.optionText,
                      selectedFolder === item && styles.optionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {selectedFolder === item && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.list}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E5F0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    maxWidth: 150,
  },
  pickerText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  list: {
    maxHeight: 300,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
    gap: 12,
  },
  optionRowSelected: {
    backgroundColor: '#F2F8FF',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  optionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
});
