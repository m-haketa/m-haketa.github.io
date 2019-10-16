// ==UserScript==
// @name         Freee_ChangeColor
// @namespace    http://gas.excelspeedup.com/
// @version      0.1
// @description  freeeの色を変える
// @author       m-haketa
// @match        https://secure.freee.co.jp/*
// @grant        none
// ==/UserScript==

(function() {
  "use strict";

  function setStyle(elements, stylename, value) {
    for (var i = 0; i < elements.length; i++) {
      elements[i].style[stylename] = value;
      console.log(i);
    }
  }

  function changeColor() {
    setStyle(
      document.getElementsByClassName("tags-combobox__tagify-tag--partner"),
      "backgroundColor",
      "#f5dede"
    );
    setStyle(
      document.getElementsByClassName("expense"),
      "backgroundColor",
      "#f5dede"
    );
    setStyle(
      document.getElementsByClassName("tagify-tag-bg-partner"),
      "backgroundColor",
      "#f5dede"
    );
    console.log("test");
  }

  document.addEventListener("click", changeColor);
  document.addEventListener("readystatechange", changeColor);
})();
