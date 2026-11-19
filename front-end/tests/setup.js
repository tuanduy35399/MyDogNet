import '@testing-library/jest-dom';

// Polyfill window.scrollTo in JSDOM
window.scrollTo = () => {};

// Polyfill HTMLDialogElement in JSDOM if needed
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
    this.removeAttribute('open');
  };
}
