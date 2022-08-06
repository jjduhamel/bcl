<script>
export default {
  props: {
    icon: String,
    text: String
  },
}
</script>

<template>
  <button>
    <slot />
  </button>
</template>
