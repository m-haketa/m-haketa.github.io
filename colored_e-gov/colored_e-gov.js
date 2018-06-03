// ==UserScript==
// @name         colored e-gov
// @namespace    https://www.excelspeedup.com/
// @version      0.1
// @description  e-govの税法条文に色をつけます
// @author       m-haketa
// @match        *://elaws.e-gov.go.jp/search/*
// @require      https://cdnjs.cloudflare.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @grant        none
// ==/UserScript==

// https://sem.excelspeedup.com/test/colored_e-gov.js

//copy&paste below

(function() {
  'use strict';

  if ( window !== window.top ) {
    return;
  }

  var tagPos = function(strPosS,strPosE,tagNo) {
    this.strPosS = strPosS;
    this.strPosE = strPosE;
    this.tagNo = tagNo;
  };

  var tagsToColor = function(innerHTML) {
    this.innerHTMLOrigin = innerHTML;

    //開始タグの位置を記録する配列　※要素としてはtagPosを取る
    this.tagStackOrigin = [];

    //開始タグ・終了タグの対を記録する配列　※要素としてはtagPosを取る
    this.tagCorrespondence = [];

    //色番号
    this.colorIndex = 0;

  };

  //識別するタグ　※優先度が低いほうから順番に並べる
  tagsToColor.prototype.tags_s = ['（', '「', '<td'];
  tagsToColor.prototype.tags_e = ['）', '」', '</td'];

  //実際に色を付けるタグ（1：色をつける、0：色をつけない）
  tagsToColor.prototype.tags_toBeColored = [1,1,0];

  // 付加するタグ　C1,C2というようにspanTag＋colorIndexを付加する
  tagsToColor.prototype.spanTag = 'C';

  tagsToColor.prototype.cssInserted = false;

  tagsToColor.prototype.insertCSS = function() {
    if (this.cssInserted) return;
    this.cssInserted = true;

    var newStyle = document.createElement('style');
    newStyle.type = "text/css";
    document.getElementsByTagName('head').item(0).appendChild(newStyle);
    var CSS = document.styleSheets.item(0);

    var idx = document.styleSheets[0].cssRules.length;

    CSS.insertRule("span.C1 { color: #CC0000; }",idx);
    CSS.insertRule("span.C2 { color: #999900; }",idx);
    CSS.insertRule("span.C3 { color: #009999; }",idx);
    CSS.insertRule("span.C4 { color: #202080; }",idx);
    CSS.insertRule("span.C5 { color: #CC00CC; }",idx);

  };

  tagsToColor.prototype.insertColorStartTag = function() {
    this.colorIndex++;
    return '<span class="' + this.spanTag + String(this.colorIndex) + '">';
  };

  tagsToColor.prototype.insertColorEndTag = function() {
    this.colorIndex--;
    return '</span>';
  };


  tagsToColor.prototype.push_tags_origin  = function(strPosS,tagNo) {
    this.tagStackOrigin.push(new tagPos(strPosS,0,tagNo));
  };

  tagsToColor.prototype.pop_tags_origin  = function(strPosE,tagNo) {
    //対応する開始タグを取得
    var tagS;
    if (this.tagStackOrigin.length > 0) {
      tagS = this.tagStackOrigin.pop();
    } else {
      //開始タグがない場合。tags_sの中で最大のもの(<td）とみなしてデータを作成
      tagS = new tagPos(0,0,this.tags_s.length - 1);
    }

    if (tagS.tagNo < tagNo) {
      //開始タグのほうが優先度が低い
      this.tagCorrespondence.push(new tagPos(tagS.strPosS,strPosE,tagS.tagNo));

      //優先度が同じタグに行き着くまで、POPを繰り返す
      this.pop_tags_origin(strPosE, tagNo);
    } else if (tagS.tagNo === tagNo) {
      //優先度が同一
      this.tagCorrespondence.push(new tagPos(tagS.strPosS,strPosE,tagNo));
    } else {
      //開始タグのほうが優先度が高い
      this.tagCorrespondence.push(new tagPos(tagS.strPosS,strPosE,tagNo));

      //今回処理した開始タグは、別の終了タグと対応するものであるため、再度pushしておく
      this.tagStackOrigin.push(tagS);
    }
  };

  tagsToColor.prototype.pop_tags_last_origin  = function(strPosE) {
//末尾まで探索したが、まだstackにデータが残っている場合
    if (this.tagStackOrigin.length > 0) {
      //終了タグがない場合。tags_sの中で最大のもの(</td）とみなしてデータを作成
      this.pop_tags_origin(strPosE,this.tags_s.length - 1);
    }

  };

  tagsToColor.prototype.parse = function() {
    for (var strPos=0;strPos<this.innerHTMLOrigin.length;strPos++) {
      for (var tagNo=0;tagNo<this.tags_s.length;tagNo++) {

        //開始タグの判定
        if (this.innerHTMLOrigin.substr(strPos,this.tags_s[tagNo].length) === this.tags_s[tagNo]) {
          this.push_tags_origin(strPos,tagNo);
        }

        //終了タグの判定
        if (this.innerHTMLOrigin.substr(strPos,this.tags_e[tagNo].length) === this.tags_e[tagNo]) {
          this.pop_tags_origin(strPos,tagNo);
        }

      }
    }

  //対応する終了タグがない場合には、最後に書き出しておく
    this.pop_tags_last_origin(strPos-1);


  //配列を、strPosSの順でソート
    this.tagCorrespondence.sort(function(a,b) {
      if (a.strPosS < b.strPosS) { return -1; }
      if (a.strPosS > b.strPosS) { return 1; }
      return 0;
    })

  };

  tagsToColor.prototype.getHTMLColorTagsInserted = function() {
    //処理済の開始タグに対応する終了タグを一時的に格納
    var EndTags = [];

    //元テキストのうち何文字目まで処理済か
    var strPos = 0;

    //出力HTML
    var outputHTML = '';

    //色番号を初期化
    this.colorIndex = 0;

    //c:tagCorrespondenceの要素番号
    var c=0;
    var EndTag;
    while (c < this.tagCorrespondence.length) {
      //元々色を付けないタグのときは、無処理で次に進む
      if (this.tags_toBeColored[this.tagCorrespondence[c].tagNo] === 0) {
        c++;
        continue;
      }

      //開始タグと終了タグを比較して、開始タグのほうが番号が小さいとき
      if (EndTags.length === 0 || this.tagCorrespondence[c].strPosS < EndTags[EndTags.length-1].strPosE) {
        outputHTML += this.innerHTMLOrigin.slice(strPos, this.tagCorrespondence[c].strPosS) + this.insertColorStartTag();
        strPos = this.tagCorrespondence[c].strPosS;
        EndTags.push(this.tagCorrespondence[c]);
        c++;
      } else {
        EndTag = EndTags.pop();
        outputHTML += this.innerHTMLOrigin.slice(strPos, EndTag.strPosE + 1) + this.insertColorEndTag();
        strPos = EndTag.strPosE + 1;
      }
    }

    //終了タグだけ余っている場合に追加で処理
    while (EndTags.length > 0) {
      EndTag = EndTags.pop();
      outputHTML += this.innerHTMLOrigin.slice(strPos, EndTag.strPosE + 1) + this.insertColorEndTag();
      strPos = EndTag.strPosE + 1;
    }

    outputHTML += this.innerHTMLOrigin.slice(strPos);

    return outputHTML;
  };


  var Sentences = document.querySelectorAll("[class$=Sentence]");
  var i = 0;

  var process = function() {
    for (; i < Sentences.length; i++) {
      var tc = new tagsToColor(Sentences[i].innerHTML);
      tc.insertCSS();
      tc.parse();
      Sentences[i].innerHTML = tc.getHTMLColorTagsInserted();
      tc = null;

      /*
      if ((i + 1 < Sentences.length) && (i % 100 === 0) ) {
        setTimeout(process, 500);
      }
      */

    }
  };

  process();


})();
