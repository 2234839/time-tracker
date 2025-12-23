<template>
  <div class="batch-edit-form">
    <p class="info-text">将批量更新 {{ recordIds.length }} 条记录</p>

    <div class="form-group">
      <label>
        <input type="checkbox" v-model="updateRate" />
        更新每小时费用
      </label>
      <input
        v-if="updateRate"
        v-model.number="hourlyRate"
        type="number"
        min="0"
        step="0.01"
        placeholder="0.00"
      />
    </div>

    <div class="form-group">
      <label>
        <input type="checkbox" v-model="updateNote" />
        更新备注
      </label>
      <input
        v-if="updateNote"
        v-model="note"
        type="text"
        placeholder="新备注内容"
      />
    </div>

    <div class="form-actions">
      <button type="button" class="btn-secondary" @click="$emit('cancel')">取消</button>
      <button type="button" class="btn-primary" @click="handleSubmit" :disabled="!updateRate && !updateNote">
        应用更改
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  recordIds: string[]
}>()

const emit = defineEmits<{
  submit: [data: { hourlyRate?: number; note?: string }]
  cancel: []
}>()

const updateRate = ref(false)
const updateNote = ref(false)
const hourlyRate = ref(0)
const note = ref('')

function handleSubmit() {
  const data: { hourlyRate?: number; note?: string } = {}
  if (updateRate.value) {
    data.hourlyRate = hourlyRate.value
  }
  if (updateNote.value) {
    data.note = note.value
  }
  emit('submit', data)
}
</script>

<style scoped>
.info-text {
  font-size: 13px;
  color: #666;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 14px;
}

.form-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  cursor: pointer;
}

.form-group input[type="checkbox"] {
  width: auto;
  cursor: pointer;
}

.form-actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
