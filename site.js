/* CineMaster AI 홈페이지 동작 (규칙: docs/site_design.md)
 *  1) 첫 화면 와이프 비교: 끌기 · 클릭 · 방향키 (움직임 줄이기 설정이면 처음 들어오는 움직임 없음)
 *  2) 룩 바꿔 끼우기: 오른쪽 그레이딩 이미지를 다른 룩의 실제 렌더로 바꾼다
 *  3) 작업 순서 탭: 앱의 실제 다섯 페이지 캡처 (←/→ · Home/End)
 *  3c) 큰 탭(소개 · 기능 · 색공간 · 워크플로우 · 다운로드 · 더 보기) → 작은 탭 → 목록. 주소의 #이름 으로 연다
 *  4) 설치 파일 · 포터블 버튼: 링크가 비었거나 같은 사이트 파일이 아직 없으면 "준비 중" 안내
 *  5) SHA-256 복사, 6) 웹 버전을 이 페이지 안에서 열기
 */
(function () {
  "use strict";
  var site = window.CINEMASTER_SITE || {};
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // ── 안내 메시지 ──
  var toastEl = $(".toast"), toastTimer = 0;
  function toast(text) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.hidden = true; }, 6000);
  }

  // ── 1) 와이프 ──
  var wrap = $(".wipe-wrap"), frame = $("[data-wipe]"), handle = frame && $(".handle", frame);
  var pos = 50, dragging = false;
  function setWipe(p) {
    pos = Math.max(0, Math.min(100, p));
    wrap.style.setProperty("--wipe", pos + "%");
    handle.setAttribute("aria-valuenow", String(Math.round(pos)));
    handle.setAttribute("aria-valuetext", "왼쪽 Log 원본 " + Math.round(pos) + "%");
  }
  if (frame && handle) {
    var fromEvent = function (e) { var r = frame.getBoundingClientRect(); return ((e.clientX - r.left) / r.width) * 100; };
    frame.addEventListener("pointerdown", function (e) {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging = true;
      try { frame.setPointerCapture(e.pointerId); } catch (_) {}
      setWipe(fromEvent(e));
      handle.focus({ preventScroll: true });
    });
    frame.addEventListener("pointermove", function (e) { if (dragging) setWipe(fromEvent(e)); });
    var stop = function () { dragging = false; };
    frame.addEventListener("pointerup", stop);
    frame.addEventListener("pointercancel", stop);
    handle.addEventListener("keydown", function (e) {
      var step = e.shiftKey ? 10 : 2;
      if (e.key === "ArrowLeft") { setWipe(pos - step); e.preventDefault(); }
      else if (e.key === "ArrowRight") { setWipe(pos + step); e.preventDefault(); }
      else if (e.key === "Home") { setWipe(0); e.preventDefault(); }
      else if (e.key === "End") { setWipe(100); e.preventDefault(); }
    });
    // 처음 한 번만: 선이 오른쪽에서 가운데로 들어와 Log 원본을 보여 준다
    if (!reduce) {
      setWipe(82);
      var t0 = null;
      var anim = function (t) {
        if (dragging) return;
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1300);
        setWipe(82 - 32 * (1 - Math.pow(1 - k, 3)));
        if (k < 1) requestAnimationFrame(anim);
      };
      setTimeout(function () { requestAnimationFrame(anim); }, 450);
    }
  }

  // ── 2) 룩 바꿔 끼우기 ──
  var looks = site.looks || [];
  var lookBtns = $$(".looks [role=radio]");
  var gImg = $("[data-grade-img]"), gSrc = $("[data-grade-source]"), gTag = $("[data-grade-tag]"), gDesc = $("[data-look-desc]");
  function pickLook(i, focus) {
    var L = looks[i];
    if (!L) return;
    lookBtns.forEach(function (b, j) {
      b.setAttribute("aria-checked", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    if (gSrc) gSrc.srcset = L.file_960;
    if (gImg) { gImg.src = L.file; gImg.alt = "같은 장면에 " + L.title + " 룩을 입힌 결과"; }
    if (gTag) gTag.textContent = L.title;
    if (gDesc) gDesc.textContent = L.description;
    if (focus) lookBtns[i].focus();
  }
  lookBtns.forEach(function (b, i) {
    b.addEventListener("click", function () { pickLook(i); });
    b.addEventListener("keydown", function (e) {
      var n = lookBtns.length, k = null;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") k = (i + 1) % n;
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") k = (i - 1 + n) % n;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = n - 1;
      if (k !== null) { e.preventDefault(); pickLook(k, true); }
    });
  });
  // 다른 룩 이미지를 미리 받아 둔다 (바꿀 때 깜빡이지 않게)
  window.addEventListener("load", function () {
    var small = window.matchMedia("(max-width: 760px)").matches;
    looks.slice(1).forEach(function (L) { var im = new Image(); im.src = small ? L.file_960 : L.file; });
  });

  // ── 3) 작업 순서 탭 ──
  var PAGES = {
    media: ["MEDIA", "원본 Log 스틸이나 영상을 불러오면 카메라와 Log 종류를 알아서 추천합니다. 드라이브를 썸네일로 둘러보고 쓸 클립을 미디어 풀에 모아 두며, 레퍼런스 스틸을 올려 색을 맞출 준비를 합니다."],
    conform: ["CONFORM", "여러 컷을 카드로 늘어놓고 같은 룩을 걸어 장면 전체의 색을 맞춥니다. XML · EDL 타임라인을 읽거나 Resolve 타임라인을 그대로 가져오고, 컷마다 노출 차이를 눈금으로 봅니다."],
    color: ["COLOR", "왼쪽 Master 패널과 컬러 휠, 커브, 구간별 노출, 색상 메쉬로 룩을 만듭니다. 보정은 노드에 나눠 쌓고, 오른쪽 스코프를 보면서 확인합니다."],
    film: ["FILM LAB", "네거티브와 프린트 필름을 고르고 증감 현상, 프린터 라이트, Print Contrast, 그레인과 할레이션으로 필름 현상소의 과정을 거칩니다."],
    deliver: ["DELIVER", "출력 색역과 감마를 고르고 납품 QC 를 돌린 뒤 .cube, Resolve 노드 패키지, HDR 듀얼 마스터로 내보냅니다. 여러 출력을 한 번에 구울 수도 있습니다."]
  };
  // 영상 바꿔 끼우기: 실제 앱을 조작해 녹화한 클립 (site/capture/capture_videos.py). 소리 없음 · 반복 · 눌러서 멈춤
  function setClip(v, name, label) {
    if (!v) return;
    v.poster = "video/" + name + ".jpg";
    v.src = "video/" + name + ".mp4";
    v.setAttribute("aria-label", label);
    v.load();
    if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
  }
  $$("video").forEach(function (v) {
    if (reduce) { v.removeAttribute("autoplay"); v.controls = true; v.pause(); }
    v.addEventListener("click", function () { if (v.paused) v.play(); else v.pause(); });
  });
  var tabs = $$(".page-tabs [role=tab]"), pImg = $("[data-page-video]"), pText = $("[data-page-text]"), panel = $("#pp");
  function pickPage(i, focus) {
    var t = tabs[i];
    if (!t) return;
    var key = t.getAttribute("data-page"), info = PAGES[key];
    tabs.forEach(function (b, j) {
      b.setAttribute("aria-selected", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    panel.setAttribute("aria-labelledby", t.id);
    setClip(pImg, key, info[0] + " 페이지를 실제로 조작하는 영상");
    pText.textContent = info[1];
    if (focus) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pickPage(i); });
    t.addEventListener("keydown", function (e) {
      var n = tabs.length, k = null;
      if (e.key === "ArrowRight") k = (i + 1) % n;
      else if (e.key === "ArrowLeft") k = (i - 1 + n) % n;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = n - 1;
      if (k !== null) { e.preventDefault(); pickPage(k, true); }
    });
  });

  // ── 3b) 큰 틀 6개: 왼쪽 목록을 고르면 오른쪽 실제 화면과 요점이 바뀐다 (↑/↓ · Home/End) ──
  var PILLARS = {
    same: { img: "shots/deliver", alt: "DELIVER 페이지. 출력 색역과 전달 곡선 그래프, LUT 정확도 리포트, 일괄 내보내기 큐",
      points: ["프로그램 엔진, 화면, 브라우저 버전이 같은 수식을 씁니다", ".cube LUT 33 · 65 크기, 범위 세 가지", "LUT 에 담기지 않는 질감은 DCTL 로", "노드마다 LUT 을 나눈 Resolve 노드 패키지"],
      note: "화면과 내보낸 LUT 이 같은지는 94가지 상태로 매번 자동 비교합니다." },
    tools: { img: "shots/tools", alt: "COLOR 페이지의 HDR Zones. 여섯 노출 구간을 3×2 로 놓은 화면과 왼쪽 Master 패널, 오른쪽 노드 그래프",
      points: ["Master 패널과 Lift · Gamma · Gain · Offset 휠", "HDR Zones: 여섯 노출 구간을 한 화면에서", "3D Warper: 색상 메쉬의 점을 직접 끌기", "ColorSlice 7색 · 커브 · Split-Toning", "노드 16개, 원형 · 선형 · 다각형 Power Window", "HSL 퀄리파이어와 매트 다듬기"],
      note: "단축키는 DaVinci Resolve 와 같습니다. Alt + S 노드 추가, Ctrl + D 끄고 켜기." },
    film: { img: "shots/film", alt: "FILM LAB 페이지. 증감 현상, Print Contrast, 컬러 헤드 조절과 뷰어의 필름 그레이딩 결과",
      points: ["네거티브 10종, 프린트 6종", "Push / Pull 증감 현상과 프린터 라이트", "Print Contrast · Black Point", "할레이션 · 블룸 · 그레인 · 게이트 위브", "갖고 있는 필름 LUT 을 나만의 스톡으로"],
      note: "그레인 · 할레이션 같은 질감은 LUT 에 담기지 않아 DCTL 로 함께 내보냅니다." },
    verify: { img: "shots/verify", alt: "스킨톤 레이더와 2×2 스코프(Parade · Waveform · Vectorscope · Histogram)를 함께 띄운 COLOR 페이지",
      points: ["참고 사진 한 장에 색을 맞추는 1:1 Shot Match", "RGB Parade · Waveform · Vectorscope · Histogram", "스킨톤 레이더와 피부색 보호", "False Color 와 11-Zone 노출 확인", "스포이드로 화이트밸런스 · 피부색 지정"],
      note: "Shot Match 와 레퍼런스 톤 매칭은 설치형에서 쓸 수 있습니다." },
    deliver: { img: "pages/deliver", alt: "DELIVER 페이지. 출력 변환, 납품 QC, 내보내기 세 칸",
      points: ["출력 색역 7종 × 감마 11종", "HDR10 · SDR 듀얼 마스터, Dolby Vision XML", "납품 QC 와 Auto-Legalize", "LUT 정확도 리포트", "여러 출력을 한 번에 굽는 일괄 내보내기", "현장용 33pt + 후반용 65pt 분리 저장"],
      note: "HDR 납품과 노드 패키지는 설치형에서 쓸 수 있습니다." },
    resolve: { img: "shots/resolve", alt: "MEDIA 페이지. 미디어 풀의 클립 썸네일과 오른쪽 Resolve 라이브 연동 패널",
      points: ["Resolve 컬러 페이지에서 고른 클립을 따라가기", "출품 규격을 검사한 뒤 지정한 노드에만 보내기", "클립별 룩 저장과 같은 씬 일괄 보내기", "미디어 풀: 별점 · 색 라벨 · 빈, 다시 연결", "프로젝트 관리자와 XML · EDL 컨폼"],
      note: "설치형과 DaVinci Resolve Studio 가 필요합니다." }
  };
  var pTabs = $$(".pillar-tabs [role=tab]"), plImg = $("[data-pillar-video]"), plPts = $("[data-pillar-points]"), plNote = $("[data-pillar-note]"), plPanel = $("#plp");
  function pickPillar(i, focus) {
    var t = pTabs[i];
    if (!t || !plImg) return;
    var d = PILLARS[t.getAttribute("data-pillar")];
    if (!d) return;
    pTabs.forEach(function (b, j) {
      b.setAttribute("aria-selected", j === i ? "true" : "false");
      b.tabIndex = j === i ? 0 : -1;
    });
    plPanel.setAttribute("aria-labelledby", t.id);
    setClip(plImg, "f_" + t.getAttribute("data-pillar"), d.alt + " (실제 조작 영상)");
    plPts.innerHTML = "";
    d.points.forEach(function (p) { var li = document.createElement("li"); li.textContent = p; plPts.appendChild(li); });
    plNote.textContent = d.note;
    if (focus) t.focus();
  }
  pTabs.forEach(function (t, i) {
    t.addEventListener("click", function () { pickPillar(i); });
    t.addEventListener("keydown", function (e) {
      var n = pTabs.length, k = null;
      if (e.key === "ArrowDown" || e.key === "ArrowRight") k = (i + 1) % n;
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") k = (i - 1 + n) % n;
      else if (e.key === "Home") k = 0;
      else if (e.key === "End") k = n - 1;
      if (k !== null) { e.preventDefault(); pickPillar(k, true); }
    });
  });

  // ── 3c) 큰 탭(화면) · 작은 탭: 주소의 #이름 으로 연다 ──
  //   #download 같은 화면 이름, #updates · #web 같은 작은 탭 이름 모두 된다 (앱의 새 버전 알림이 쓰는 주소 포함).
  var views = $$("[data-view]"), navLinks = $$("[data-nav]");
  $$("[data-subs]").forEach(function (box) {
    var subTabs = $$(".subtabs [role=tab]", box);
    subTabs.forEach(function (t, i) {
      var panel = document.getElementById(t.getAttribute("data-sub"));
      if (!panel) { t.hidden = true; return; }           // 문의 칸이 없는 빌드
      panel.classList.add("subpanel");
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", t.id);
      t.addEventListener("click", function () { pickSub(panel, true); });
      t.addEventListener("keydown", function (e) {
        var live = subTabs.filter(function (b) { return !b.hidden; }), at = live.indexOf(t), k = null;
        if (e.key === "ArrowRight") k = (at + 1) % live.length;
        else if (e.key === "ArrowLeft") k = (at - 1 + live.length) % live.length;
        else if (e.key === "Home") k = 0;
        else if (e.key === "End") k = live.length - 1;
        if (k !== null) { e.preventDefault(); pickSub(document.getElementById(live[k].getAttribute("data-sub")), true); live[k].focus(); }
      });
    });
  });
  function pickSub(panel, remember) {
    var box = panel.closest("[data-subs]");
    if (!box) return;
    $$(".subtabs [role=tab]", box).forEach(function (b) {
      var on = b.getAttribute("data-sub") === panel.id, p = document.getElementById(b.getAttribute("data-sub"));
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
      if (p) p.classList.toggle("is-on", on);
    });
    $$("video", box).forEach(function (v) {                  // 보이는 작은 탭의 영상만 돌린다
      var shown = v.closest(".subpanel") === panel && panel.closest("[data-view]").classList.contains("is-on");
      if (!shown) v.pause();
      else if (!reduce) { var q = v.play(); if (q && q.catch) q.catch(function () {}); }
    });
    if (remember && history.replaceState) history.replaceState(null, "", "#" + panel.id);
  }
  function showView(id, scroll) {
    var el = id && document.getElementById(id);
    var view = el && el.closest("[data-view]");
    if (!view) return false;
    views.forEach(function (v) { v.classList.toggle("is-on", v === view); });
    $$("video").forEach(function (v) {                       // 보이는 화면의 영상만 돌린다
      var sp = v.closest(".subpanel");
      if (v.closest("[data-view]") !== view || (sp && !sp.classList.contains("is-on"))) v.pause();
      else if (!reduce) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    });
    navLinks.forEach(function (a) {
      if (a.getAttribute("data-nav") === view.id) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    });
    var sub = el.closest(".subpanel");
    if (!sub && el === view) { var first = $(".subpanel", view); if (first) pickSub(first, false); }   // 큰 탭을 누르면 첫 작은 탭부터
    if (sub) pickSub(sub, false);
    if (scroll) {
      if (el === view || sub) {
        // 브라우저가 #이름 위치로 한 번 더 내려가려 하므로(작은 탭 이름일 때) 다음 프레임에도 맨 위로 올린다
        var up = function () { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); };
        up(); requestAnimationFrame(up); setTimeout(up, 60);
      }
      else el.scrollIntoView();
    }
    return true;
  }
  function fromHash(scroll) {
    var id = decodeURIComponent(location.hash.replace(/^#/, ""));
    if (id === "top" || id === "") id = "intro";
    if (!showView(id, scroll) && !$(".view.is-on")) showView("intro", false);
  }
  window.addEventListener("hashchange", function () { fromHash(true); });
  window.addEventListener("popstate", function () { fromHash(true); });
  // 페이지 안 링크: 브라우저가 그 위치로 내려가지 않게 직접 연다 (뒤로 가기는 popstate → hashchange)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.hasAttribute("data-mail-user")) return;
    // 머리줄의 로고: 첫 화면 맨 위로 돌아가면서 페이지를 새로 받는다 (새 버전이 올라왔으면 바로 보인다)
    // 새로 받을 때 브라우저가 예전 스크롤 자리를 되살리지 않게 한다 — 늘 맨 위에서 시작
    if (a.hasAttribute("data-reload")) {
      e.preventDefault();
      try { history.scrollRestoration = "manual"; } catch (_) {}
      window.scrollTo(0, 0);
      if (history.replaceState) history.replaceState(null, "", location.pathname + location.search);
      location.reload();
      return;
    }
    var id = a.getAttribute("href").slice(1);
    var target = id && document.getElementById(id);
    if (!target || !target.closest("[data-view]")) return;      // 본문 건너뛰기 같은 보통 링크는 그대로
    e.preventDefault();
    if (id !== location.hash.slice(1) && history.pushState) history.pushState(null, "", "#" + id);
    showView(id, true);
  });
  fromHash(!!location.hash);
  if (!$("[data-nav][aria-current]")) showView("intro", false);

  // ── 3d) 색공간 탭: 이름을 누르면 그 규격 · 필름으로 실제 엔진이 렌더한 그림을 보여 준다 (packaging/site_colorspace.py) ──
  var CS_CAP = {
    "in": "{n} 로 기록한 원본입니다. 색이 빠지고 대비가 낮은 것이 정상이며, 카메라마다 조금씩 다릅니다.",
    work: "{n} 로 옮긴 모습입니다. 룩은 이 상태에서 만듭니다.",
    gamut: "{n} 색역으로 내보낸 값을 일반 화면에 그대로 띄웠습니다. 넓은 색역일수록 물 빠져 보이는 것이 정상입니다.",
    gamma: "{n} 로 내보낸 값을 일반 화면에 그대로 띄웠습니다. PQ · HLG · Log 는 맞는 화면에서 봐야 제대로 보입니다.",
    neg: "{n} 네거티브만 건 결과입니다. 프린트 필름은 걸지 않았습니다.",
    print: "{n} 프린트만 건 결과입니다. 네거티브는 걸지 않았습니다."
  };
  $$("[data-cs-box]").forEach(function (box) {
    var img = $("[data-cs-img]", box), cap = $("[data-cs-cap]", box), btns = $$("[data-cs]", box);
    if (!img || !btns.length) return;
    function pick(b) {
      var part = b.getAttribute("data-cs").split(":"), name = b.getAttribute("data-name") || b.textContent.trim();
      btns.forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      var file = "img/cs/" + part[0] + "_" + part[1] + ".jpg";
      if (img.getAttribute("src") !== file) img.src = file;
      img.alt = name + " 미리보기";
      cap.textContent = (CS_CAP[part[0]] || "{n}").replace("{n}", name);
    }
    btns.forEach(function (b) { b.addEventListener("click", function () { pick(b); }); });
    var first = btns.filter(function (b) { var q = b.getAttribute("data-cs").split(":"); return img.getAttribute("src") === "img/cs/" + q[0] + "_" + q[1] + ".jpg"; })[0];
    pick(first || btns[0]);
  });

  // ── 3e) 바닥글: 맨 위로 화살표 · 메일 주소 조립 (문의 칸과 같은 방식, 주소를 뒤집어 둔다) ──
  $$("[data-top]").forEach(function (b) {
    b.addEventListener("click", function () { window.scrollTo({ top: 0, left: 0, behavior: reduce ? "instant" : "smooth" }); });
  });
  $$("[data-mail-user]").forEach(function (a) {
    var r = function (t) { return t.split("").reverse().join(""); };
    var m = r(a.getAttribute("data-mail-user")) + "@" + r(a.getAttribute("data-mail-domain"));
    a.textContent = m;
    if (a.tagName === "A") a.href = "mailto:" + m + "?subject=" + encodeURIComponent("CineMaster AI 문의");   // 바닥글은 글자만 (눌리지 않는다)
  });

  // ── 4) 설치 파일 · 포터블 버튼 ──
  function guard(selector, url, message, onPending) {
    var buttons = $$(selector);
    if (!buttons.length) return;
    function pending() {
      buttons.forEach(function (b) {
        b.classList.add("is-pending");
        b.setAttribute("aria-disabled", "true");
        b.addEventListener("click", function (e) { e.preventDefault(); toast(message); });
      });
      if (onPending) onPending();
    }
    if (!url) { pending(); return; }
    if (/^https?:/i.test(url)) { buttons.forEach(function (b) { b.setAttribute("rel", "noopener"); }); return; }
    buttons.forEach(function (b) { b.setAttribute("download", ""); });
    if (location.protocol.indexOf("http") === 0) {
      fetch(url, { method: "HEAD", cache: "no-store" })
        .then(function (r) { if (!r.ok) pending(); })
        .catch(pending);
    }
  }
  var inst = site.installer || {}, port = site.portable || {};
  guard("[data-installer]", inst.url, "설치 파일을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.", function () {
    var meta = $("[data-installer-meta]");
    if (meta) meta.textContent = "설치 파일을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.";
  });
  guard("[data-portable]", port.url, "무설치 버전을 준비하고 있습니다. 그동안 웹 버전을 써 보세요.");

  // ── 5) SHA-256 복사 ──
  $$("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      var done = function () { b.textContent = "복사됨"; setTimeout(function () { b.textContent = "복사"; }, 1600); };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(done, function () { toast(text); });
      } else {
        toast(text);
      }
    });
  });

  // ── 6) 웹 버전을 이 페이지 안에서 열기 ──
  var webFrame = $("[data-web-frame]"), openBtn = $("[data-web-open]");
  if (webFrame && openBtn) {
    openBtn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = "app/";
      f.title = "CineMaster AI 웹 버전";
      f.setAttribute("allow", "clipboard-write; fullscreen");
      f.setAttribute("allowfullscreen", "");
      webFrame.innerHTML = "";
      webFrame.appendChild(f);
      var bar = document.createElement("div");
      bar.className = "web-bar";
      var full = document.createElement("button");
      full.type = "button";
      full.className = "btn btn-line";
      full.textContent = "전체 화면으로 보기";
      full.addEventListener("click", function () { if (webFrame.requestFullscreen) webFrame.requestFullscreen(); });
      var win = document.createElement("a");
      win.className = "btn btn-line";
      win.href = "app/";
      win.target = "_blank";
      win.rel = "noopener";
      win.textContent = "새 창으로 열기";
      bar.appendChild(full);
      bar.appendChild(win);
      webFrame.parentNode.insertBefore(bar, webFrame.nextSibling);
      f.focus();
    });
  }
})();
