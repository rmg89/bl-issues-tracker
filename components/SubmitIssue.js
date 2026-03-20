import React, { useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, Image, Alert
} from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { COLORS } from '../lib/constants'
import { createIssue } from '../lib/api'

export default function SubmitScreen({ currentUser, onSubmitted }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState('medium')
  const [location, setLocation] = useState('')
  const [photos, setPhotos] = useState([])
  const [reportedVia, setReportedVia] = useState('')
  const [reportedByName, setReportedByName] = useState('')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function pickPhotos() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library to attach photos.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      base64: true,
      quality: 0.7,
    })
    if (!result.canceled) {
      const picked = result.assets.map((asset, i) => ({
        uri: asset.uri,
        base64: asset.base64,
        filename: asset.fileName || `photo_${Date.now()}_${i}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      }))
      setPhotos(prev => [...prev, ...picked].slice(0, 5))
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take photos.')
      return
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    })
    if (!result.canceled) {
      const asset = result.assets[0]
      setPhotos(prev => [...prev, {
        uri: asset.uri,
        base64: asset.base64,
        filename: asset.fileName || `photo_${Date.now()}.jpg`,
        mimeType: asset.mimeType || 'image/jpeg',
      }].slice(0, 5))
    }
  }

  function removePhoto(index) {
    setPhotos(prev => prev.filter((_, i) => i !== index))
  }

  async function submit() {
    if (!title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError('')
    try {
      await createIssue({
        title: title.trim(),
        description: description.trim(),
        urgency,
        location: location.trim(),
        submittedBy: currentUser.username,
        submittedByName: currentUser.name,
        status: 'submitted',
        reportedVia,
        reportedByName,
        photos: photos.map(p => ({
          base64: p.base64,
          filename: p.filename,
          mimeType: p.mimeType,
        })),
      })
      setSuccess(true)
      setTitle(''); setDescription(''); setUrgency('medium'); setLocation(''); setPhotos([])
      setReportedVia(''); setReportedByName('')
      setTimeout(() => setSuccess(false), 3000)
      if (onSubmitted) onSubmitted()
    } catch (e) {
      setError('Something went wrong. Please try again.')
    }
    setSaving(false)
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.wrap} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {success && (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>✓ Issue submitted successfully</Text>
          </View>
        )}

        <View style={styles.field}>
          <Text style={styles.label}>TITLE *</Text>
          <TextInput
            style={styles.input}
            placeholder="Brief description of the issue"
            placeholderTextColor={COLORS.textTertiary}
            value={title}
            onChangeText={setTitle}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>DESCRIPTION</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="More details about the issue..."
            placeholderTextColor={COLORS.textTertiary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>URGENCY</Text>
          <View style={styles.urgencyRow}>
            {['low', 'medium', 'high'].map(u => (
              <TouchableOpacity
                key={u}
                style={[styles.urgencyBtn, urgency === u && styles[`urgency_${u}`]]}
                onPress={() => setUrgency(u)}
              >
                <Text style={[styles.urgencyBtnText, urgency === u && styles[`urgencyText_${u}`]]}>
                  {u.charAt(0).toUpperCase() + u.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>LOCATION / EQUIPMENT</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Floor 2, Rack 3"
            placeholderTextColor={COLORS.textTertiary}
            value={location}
            onChangeText={setLocation}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>REPORTED BY</Text>
          <View style={styles.reportedRow}>
            {['Staff (self)', 'Client', 'Other'].map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.reportedBtn, reportedVia === opt && styles.reportedBtnActive]}
                onPress={() => { setReportedVia(opt); setReportedByName(opt === 'Staff (self)' ? currentUser.name : '') }}
              >
                <Text style={[styles.reportedBtnText, reportedVia === opt && styles.reportedBtnTextActive]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {reportedVia !== '' && reportedVia !== 'Staff (self)' && (
            <TextInput
              style={[styles.input, { marginTop: 8 }]}
              placeholder={
                reportedVia === 'Trainer' ? "Trainer's name" :
                reportedVia === 'Client' ? "Client's name" :
                'Name and context'
              }
              placeholderTextColor={COLORS.textTertiary}
              value={reportedByName}
              onChangeText={setReportedByName}
            />
          )}
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>PHOTOS (optional, max 5)</Text>
          {photos.length > 0 && (
            <View style={styles.photosRow}>
              {photos.map((photo, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri: photo.uri }} style={styles.photoImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.photoRemove} onPress={() => removePhoto(i)}>
                    <Text style={styles.photoRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
          {photos.length < 5 && (
            <View style={styles.photoButtons}>
              <TouchableOpacity style={styles.photoBtn} onPress={takePhoto}>
                <Text style={styles.photoBtnText}>📷 Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoBtn} onPress={pickPhotos}>
                <Text style={styles.photoBtnText}>🖼 Library</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.submitBtn, saving && styles.disabled]}
          onPress={submit}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.submitBtnText}>Submit issue</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 16, paddingBottom: 40 },
  successBanner: {
    backgroundColor: COLORS.greenLight, borderRadius: 10,
    padding: 12, marginBottom: 16,
  },
  successText: { color: COLORS.green, fontWeight: '600', fontSize: 14 },
  field: { marginBottom: 20 },
  label: {
    fontSize: 11, fontWeight: '600', color: COLORS.textTertiary,
    letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 10,
    padding: 12, fontSize: 15, color: COLORS.text,
  },
  textarea: { height: 100, textAlignVertical: 'top' },
  urgencyRow: { flexDirection: 'row', gap: 8 },
  urgencyBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center',
  },
  urgency_low: { backgroundColor: '#F1F8E9', borderColor: '#AED581' },
  urgency_medium: { backgroundColor: COLORS.amberLight, borderColor: '#FFB74D' },
  urgency_high: { backgroundColor: COLORS.redLight, borderColor: '#EF9A9A' },
  urgencyBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  urgencyText_low: { color: '#558B2F' },
  urgencyText_medium: { color: COLORS.amber },
  urgencyText_high: { color: COLORS.red },
  photosRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  photoThumb: { position: 'relative' },
  photoImage: { width: 80, height: 80, borderRadius: 8, borderWidth: 0.5, borderColor: COLORS.border },
  photoRemove: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: COLORS.red, borderRadius: 10,
    width: 20, height: 20, alignItems: 'center', justifyContent: 'center',
  },
  photoRemoveText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  photoButtons: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 10, paddingVertical: 10,
    alignItems: 'center',
  },
  photoBtnText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  error: { color: COLORS.red, fontSize: 13, marginBottom: 12 },
  submitBtn: {
    backgroundColor: COLORS.orange, borderRadius: 10,
    padding: 16, alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  disabled: { opacity: 0.6 },
  reportedRow: { flexDirection: 'row', gap: 8 },
  reportedBtn: {
    flex: 1, padding: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface, alignItems: 'center',
  },
  reportedBtnActive: { backgroundColor: COLORS.orangeLight, borderColor: COLORS.orange },
  reportedBtnText: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary },
  reportedBtnTextActive: { color: COLORS.orangeDark, fontWeight: '600' },
})