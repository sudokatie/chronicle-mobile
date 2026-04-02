import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SortField = 'modified' | 'created' | 'title';
type SortOrder = 'asc' | 'desc';

interface SortPickerProps {
  sortBy: SortField;
  sortOrder: SortOrder;
  onSelect: (sortBy: SortField, sortOrder: SortOrder) => void;
}

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'modified', label: 'Date Modified' },
  { value: 'created', label: 'Date Created' },
  { value: 'title', label: 'Title' },
];

export function SortPicker({ sortBy, sortOrder, onSelect }: SortPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const handleSelectField = (field: SortField) => {
    onSelect(field, sortOrder);
  };

  const handleToggleOrder = () => {
    onSelect(sortBy, sortOrder === 'asc' ? 'desc' : 'asc');
  };

  const currentLabel = SORT_OPTIONS.find((o) => o.value === sortBy)?.label || 'Sort';

  return (
    <>
      <TouchableOpacity
        style={styles.picker}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name={sortOrder === 'desc' ? 'arrow-down' : 'arrow-up'}
          size={16}
          color="#007AFF"
        />
        <Text style={styles.pickerText} numberOfLines={1}>
          {currentLabel}
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
              <Text style={styles.modalTitle}>Sort Notes</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Sort By</Text>
              {SORT_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.optionRow,
                    sortBy === option.value && styles.optionRowSelected,
                  ]}
                  onPress={() => handleSelectField(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      sortBy === option.value && styles.optionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {sortBy === option.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order</Text>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  sortOrder === 'desc' && styles.optionRowSelected,
                ]}
                onPress={() => onSelect(sortBy, 'desc')}
              >
                <Ionicons name="arrow-down" size={20} color={sortOrder === 'desc' ? '#007AFF' : '#666'} />
                <Text
                  style={[
                    styles.optionText,
                    sortOrder === 'desc' && styles.optionTextSelected,
                  ]}
                >
                  Descending (Newest First)
                </Text>
                {sortOrder === 'desc' && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  sortOrder === 'asc' && styles.optionRowSelected,
                ]}
                onPress={() => onSelect(sortBy, 'asc')}
              >
                <Ionicons name="arrow-up" size={20} color={sortOrder === 'asc' ? '#007AFF' : '#666'} />
                <Text
                  style={[
                    styles.optionText,
                    sortOrder === 'asc' && styles.optionTextSelected,
                  ]}
                >
                  Ascending (Oldest First)
                </Text>
                {sortOrder === 'asc' && (
                  <Ionicons name="checkmark" size={20} color="#007AFF" />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.doneButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
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
    maxWidth: 160,
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
  section: {
    paddingVertical: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
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
  doneButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
