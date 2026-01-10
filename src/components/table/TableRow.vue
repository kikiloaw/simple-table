<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '../../lib/utils'

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
        'transition-colors hover:bg-gray-100 data-[state=selected]:bg-gray-100',
        props.class,
      )
    "
    v-bind="delegatedProps"
  >
    <slot />
  </tr>
</template>
