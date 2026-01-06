<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
  height?: string
  padding?: string
}>()

const delegatedProps = computed(() => {
  const { class: _, height: __, padding: ___, ...delegated } = props

  return delegated
})
</script>

<template>
  <th
    :class="
      cn(
        props.height || 'h-[38px]',
        props.padding || 'px-2.5',
        'border-b border-stone-300 align-middle font-bold text-muted-foreground [&:has([role=checkbox])]:pr-0',
        props.class,
      )
    "
    v-bind="delegatedProps"
  >
    <slot />
  </th>
</template>
