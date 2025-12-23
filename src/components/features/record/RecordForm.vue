<template>
  <form @submit.prevent="handleSubmit">
    <div class="form-group">
      <label for="startTime">开始时间</label>
      <input
        id="startTime"
        v-model="formData.startTime"
        type="datetime-local"
        required
      />
    </div>
    <div class="form-group">
      <label for="endTime">结束时间</label>
      <input
        id="endTime"
        v-model="formData.endTime"
        type="datetime-local"
      />
      <span class="form-hint">留空表示进行中</span>
    </div>
    <div class="form-group">
      <label for="rate">每小时费用（元）</label>
      <input
        id="rate"
        v-model.number="formData.hourlyRate"
        type="number"
        min="0"
        step="0.01"
        required
      />
    </div>
    <div class="form-group">
      <label for="note">备注</label>
      <textarea
        id="note"
        v-model="formData.note"
        rows="3"
        placeholder="添加备注..."
      ></textarea>
    </div>
    <div v-if="duration !== null" class="duration-preview">
      时长: {{ formatDuration(duration) }}
      <span v-if="cost !== null"> | 费用: ¥{{ cost.toFixed(2) }}</span>
    </div>
    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">取消</button>
      <button type="submit" class="btn-primary">保存</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import type { TimeRecord } from '../../../types'

const props = defineProps<{
  record?: TimeRecord | null
}>()

const emit = defineEmits<{
  submit: [data: { startTime: number; endTime: number | null; hourlyRate: number; note: string }]
  cancel: []
}>()

const formData = ref({
  startTime: '',
  endTime: '',
  hourlyRate: 0,
  note: ''
})

watch(() => props.record, (record) => {
  if (record) {
    formData.value = {
      startTime: toDateTimeLocal(record.startTime),
      endTime: record.endTime ? toDateTimeLocal(record.endTime) : '',
      hourlyRate: record.hourlyRate,
      note: record.note
    }
  }
}, { immediate: true })

const duration = computed(() => {
  if (!formData.value.startTime) return null
  const start = new Date(formData.value.startTime).getTime()
  const end = formData.value.endTime ? new Date(formData.value.endTime).getTime() : null
  if (!end) return null
  return end - start
})

const cost = computed(() => {
  if (duration.value === null || duration.value <= 0) return null
  const hours = duration.value / (1000 * 60 * 60)
  return hours * formData.value.hourlyRate
})

function toDateTimeLocal(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60))
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${hours}小时${minutes}分钟`
}

function handleSubmit() {
  const startTime = new Date(formData.value.startTime).getTime()
  const endTime = formData.value.endTime ? new Date(formData.value.endTime).getTime() : null
  emit('submit', {
    startTime,
    endTime,
    hourlyRate: formData.value.hourlyRate,
    note: formData.value.note
  })
}
</script>

<style scoped>
.form-group {
  margin-bottom: 14px;
}

.form-hint {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
  display: block;
}

.duration-preview {
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
  margin-bottom: 14px;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}
</style>
