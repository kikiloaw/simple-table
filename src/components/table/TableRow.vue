<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props

  return delegated
})
</script>

<template>
  <tr
    :class="
      cn(
        'border-b border-stone-300 transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
        props.class,
      )
    "
    v-bind="delegatedProps"
  >
    <slot />
  </tr>
</template>
