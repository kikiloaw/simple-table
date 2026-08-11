<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '../../lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  style?: any
  padding?: string
  height?: string
  colspan?: number | string
}>()

const delegatedProps = computed(() => {
  const { class: _, padding: __, height: ___, style: ____, ...delegated } = props

  return delegated
})

const cellStyle = computed(() => {
  const baseStyle = (props as any).style || {}
  const heightStyle = props.height ? { minHeight: props.height } : {}
  
  return { ...baseStyle, ...heightStyle }
})
</script>

<template>
  <td
    :class="cn(props.padding || 'px-2.5 py-2', 'border-b align-middle [&:has([role=checkbox])]:pr-0 st-cell', props.class)"
    :style="cellStyle"
    v-bind="delegatedProps"
  >
    <slot />
  </td>
</template>
