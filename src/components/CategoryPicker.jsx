import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';

// One horizontal row of chips, ending in a "+ New" chip.
function ChipRow({ items, selectedId, onSelect, onCreate, placeholder }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');

  const submit = () => {
    const name = text.trim();
    if (name) onCreate(name);
    setText('');
    setAdding(false);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      style={styles.scroll}
      contentContainerStyle={styles.row}
    >
      {items.map((item) => {
        const selected = item.id === selectedId;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.chip, selected && styles.chipSelected]}
            onPress={() => onSelect(item.id)}
          >
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );
      })}

      {adding ? (
        <TextInput
          style={[styles.chip, styles.chipInput]}
          autoFocus
          placeholder={placeholder}
          placeholderTextColor="#B4B2C8"
          value={text}
          onChangeText={setText}
          onSubmitEditing={submit}
          onBlur={() => setAdding(false)}
          returnKeyType="done"
        />
      ) : (
        <TouchableOpacity
          style={[styles.chip, styles.chipAdd]}
          onPress={() => setAdding(true)}
        >
          <Text style={styles.chipAddText}>+ New</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

export default function CategoryPicker({
  categories,
  categoryId,
  subcategoryId,
  onSelectCategory,
  onSelectSubcategory,
  onCreateCategory,
  onCreateSubcategory,
}) {
  const selected = categories.find((c) => c.id === categoryId);

  return (
    <View style={styles.wrap}>
      <ChipRow
        items={categories}
        selectedId={categoryId}
        onSelect={onSelectCategory}
        onCreate={onCreateCategory}
        placeholder="Category name"
      />
      {selected && (
        <ChipRow
          items={selected.subcategories}
          selectedId={subcategoryId}
          onSelect={onSelectSubcategory}
          onCreate={onCreateSubcategory}
          placeholder="Subcategory name"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingBottom: 12, gap: 8 },
  scroll: { flexGrow: 0 },
  row: { paddingHorizontal: 16, gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#E8E6F0', backgroundColor: '#FFFFFF' },
  chipSelected: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  chipText: { fontSize: 13, color: '#1A1825' },
  chipTextSelected: { color: '#FFFFFF', fontWeight: '600' },
  chipAdd: { borderStyle: 'dashed' },
  chipAddText: { fontSize: 13, color: '#534AB7' },
  chipInput: { minWidth: 140, fontSize: 13, color: '#1A1825' },
});