// ==UserScript==
// @name         colored e-gov ver0.2
// @namespace    https://www.excelspeedup.com/
// @version      0.1
// @description  e-govの税法条文に色をつけます
// @author       m-haketa
// @match        *://elaws.e-gov.go.jp/search/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @grant        none
// ==/UserScript==

(function() {
  'use strict';

  if ( window !== window.top ) {
    return;
  }

var opener = '（「';
var closer = '）」';
var rxparenthesis = new RegExp("[" + opener + closer + "]", "g"); // 効率化を図るため、予め正規表現オブジェクトを生成しておく
var stackcolors = ["#CC0000", "#999900", "#009999", "#2020A0", "#CC00CC"]; // 色付けに使用するカラーコードを列挙した配列

var no = 0;
var level = 0;
var innerHTML = '';
var replaceData = [];
var stack = [];

function openspan(level) {
  return '<span class="p' + level + '">';
}

function closespan() {
  return "</span>";
}

var replaceDataContent = function(openerID,closerID,offset,level) {
  this.openerID = openerID;
  this.closerID = closerID;
  this.offset   = offset;
  this.level    = typeof level !== 'undefined' ? level : [];  //配列で入れること
};

replaceDataContent.prototype.pushLevel = function(level) {
  this.level.push(level);
};

var stackContent = function(no,openerID) {
  this.no = no;
  this.openerID = openerID;
};

function analysis(match,offset,string) {
  no++;

  var openerID = opener.indexOf(match);
  var closerID = closer.indexOf(match);

  if(openerID >= 0) { // 開き括弧を検出した場合
    level++;
    stack.push( new stackContent(no,openerID));
    replaceData[no] = new replaceDataContent(openerID, closerID, offset);
    return match;
  }

  if(closerID  >= 0) { // 閉じ括弧を検出した場合
    replaceData[no] = new replaceDataContent(openerID, closerID, offset);

    do {
      var openerData;
      if (stack.length === 0) {
        //開始タグがない場合。tags_sの中で最大のもの(「)とみなしてデータを作成
        replaceData[0].openerID = opener.length;
        openerData = new stackContent(0, opener.length - 1);
        level++;
      } else {
        openerData = stack.pop();
      }

      if (openerData.openerID > closerID) {
        stack.push(openerData);
        level++;
      }

      replaceData[openerData.no].pushLevel(level);
      replaceData[no].pushLevel(level);

      level--;

    } while (openerData.openerID < closerID);

    return match;
  }
}

function replace(match,offset,string) {
  no++;
  var $ret = match;

  if (replaceData[no].openerID >= 0) {
    replaceData[no].level.forEach(function (level) {
       $ret = openspan(level) + $ret;
    });
  }

  if (replaceData[no].closerID >= 0) {
    replaceData[no].level.forEach(function (level) {
      $ret = $ret + closespan();
    });
  }

  return $ret;
}

function parse(html) {
  no = 0;
  level = -1;
  innerHTML = html;
  replaceData = [];
  stack = [];

  var outputHTMLLast = '';

  //先頭文字をダミーで入れておく
  replaceData[0] = new replaceDataContent(-1, -1, 0);

  innerHTML.replace(rxparenthesis, analysis); // 生成しておいた正規表現で置換、置換文字列は関数に生成させる

  //末尾　※replaceをする前に、対応する開き括弧のデータを変更する必要があるため、ここで処理
  while (stack.length > 0) {
    var openerData = stack.pop(); //値は使わない

    replaceData[openerData.no].pushLevel(level);
    outputHTMLLast += closespan();
    level--;
  }

  no = 0;
  var outputHTML = innerHTML.replace(rxparenthesis, replace);

  //先頭
  replaceData[0].level.forEach(function (level) {
    outputHTML = openspan(level) + outputHTML;
  });

  //末尾
  outputHTML = outputHTML + outputHTMLLast;

//  document.write(outputHTML);
  return outputHTML;
}


// 色付けに使用するカラーコードをCSSルール化してドキュメントのスタイルシートに挿入
  $.each(stackcolors, function(index, val) {
    document.styleSheets[0].insertRule("span.p" + index + " { color: " + val + "; }", document.styleSheets[0].cssRules.length);
  });

// 色付けしたい要素をセレクタで抽出し、置換処理
  $("div.ParagraphSentence,div.ItemSentence,div.ItemSentence2,div.Subitem1Sentence,div.Subitem1Sentence2,div.Subitem2Sentence,div.Subitem2Sentence2,div.Subitem3Sentence,div.Subitem3Sentence2,div.TableStruct td").each(function(){
    $(this).html(parse($(this).html()));
  });


})();