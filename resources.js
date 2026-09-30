// Commands remain readable/selectable without JavaScript or clipboard permission.
for (const button of document.querySelectorAll('[data-copy-code]')) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copyCode);
    const status = button.parentElement.querySelector('.copy-status');
    try {
      await navigator.clipboard.writeText(code.textContent);
      status.textContent = 'Copied. Review before running.';
    } catch {
      const range = document.createRange();
      range.selectNodeContents(code);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      code.closest('pre').focus();
      status.textContent = 'Copy blocked. Commands selected: press Ctrl/Cmd+C.';
    }
  });
}
