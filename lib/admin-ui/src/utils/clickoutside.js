export function clickOutside(node, handler) {
  const onClick = (event) =>
    node &&
    !node.contains(event.target) &&
    !event.defaultPrevented &&
    handler();

  document.addEventListener("click", onClick, true);

  return {
    destroy() {
      document.removeEventListener("click", onClick, true);
    },
  };
}
