export function onKeyboardActivate(event: React.KeyboardEvent, action: () => void) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }
  event.preventDefault()
  action()
}
