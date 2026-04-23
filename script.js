const defaultProgress = {
  homeIntroDone:false,
  findCarbonDone:false,
  classifyDone:false,
  quizDone:false,
  checklistDone:false,
  foundCount:0,
  foundItems: [], // [新增] 用於保留第一關找到的碳排物件
  // 1. 建立全局狀態物件 (Global State Object)
  allQuizData: {
    scores: { basics: 0, strategy: 0, action: 0 },
    history: [] // 統一存放所有單元作答紀錄：{ unit, index, q, userSelection, correctAnswer, isCorrect, feedback }
  },
  quizCompletedCount: 0, // 實戰方案進度
  checklistCompletedCount: 0, // 行動清單進度
  shuffledChecklist: null // [新增] 用於保留隨機排序後的題庫狀態
};

function getProgress(){
  const raw = localStorage.getItem('carbonProgress');
  return raw ? {...defaultProgress, ...JSON.parse(raw)} : {...defaultProgress};
}

function saveProgress(p){
  localStorage.setItem('carbonProgress', JSON.stringify(p));
}

// 實作 Fisher-Yates 陣列洗牌演算法
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function setActiveNav(){
  const page = document.body.dataset.page;
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const href = a.getAttribute('href');
    if((page === 'index' && href === 'index.html') || href.includes(page)) {
      a.classList.add('active');
    }
  });
}

function toggleMenu(){
  document.getElementById('navLinks').classList.toggle('open');
}

function homeQuestion(choice){
  const box = document.getElementById('homeFeedback');
  if(!box) return;

  const p = getProgress();
  p.homeIntroDone = true;
  saveProgress(p);

  if(choice === 'b'){
    box.className = 'feedback ok show';
    box.innerHTML = '答對了！咖啡廳雖然不是大型工廠，但從原料取得、物流配送、設備用電到外帶包裝，都會累積碳排。這也是店家需要開始理解減碳的原因。';
  }else{
    box.className = 'feedback bad show';
    box.innerHTML = '這個答案不太正確。其實咖啡廳的日常營運就包含很多碳排來源，例如冷藏設備、照明、配送、包材與原料。';
  }

  updateGlobalProgress();
}

const carbonInfo = {
  machine:'咖啡機：沖煮與蒸汽加熱都會用電，是門市中很核心的耗能設備之一。',
  fridge:'冰箱／冷藏設備：需要長時間運轉，若設備老舊或開關頻繁，耗能會更高。',
  cups:'外帶杯與包材：一次性用品看起來小，但在大量銷售下會累積可觀的碳排。',
  light:'照明：長時間營業的店家若照明配置不佳，也會增加不必要的能耗。',
  delivery:'原料配送：原料從供應商送到店裡，物流與運輸距離都會影響碳排。',
  commute:'員工通勤：員工每天上下班的交通方式，例如開車、騎車或搭乘大眾運輸，也屬於容易被忽略的間接碳排。'
};

function initFindGame(){
  const items = document.querySelectorAll('.game-item');
  if(!items.length) return;

  const progress = getProgress();
  // [修正 2. 保留作答紀錄]：使用歷史紀錄初始化 Set，避免重載頁面時進度被清空
  let found = new Set(progress.foundItems || []);
  items.forEach(item => {
    if (found.has(item.dataset.id)) {
      item.classList.add('found');
    }
  });

  const countEl = document.getElementById('foundCount');
  const infoEl = document.getElementById('findInfo');
  const barEl = document.getElementById('findProgress');

  function render(){
    if(countEl) countEl.textContent = found.size;
    if(barEl) {
      const pct = Math.floor((found.size / 6) * 100);
      barEl.style.width = pct + '%';
    }
    progress.foundCount = found.size;
    progress.foundItems = Array.from(found); // Set 無法直接轉 JSON，轉為 Array 儲存

    if(found.size >= 6) {
      progress.findCarbonDone = true;
      saveProgress(progress);
      if(infoEl && !infoEl.innerHTML.includes('恭喜完成第一關')) {
        infoEl.innerHTML = '恭喜完成第一關！你已經找出店內主要碳排熱點，也注意到像員工通勤這樣的間接碳排來源，接下來可以進一步學習如何分類與改善。';
      }
      // [修正 1. 單元跳轉按鈕] 完成後顯示按鈕
      const nextActionEl = document.getElementById('nextLevelAction');
      if(nextActionEl) nextActionEl.style.display = 'block';
      updateGlobalProgress();
    }else{
      saveProgress(progress);
    }
  }

  items.forEach(item=>{
    item.addEventListener('click', ()=>{
      const id = item.dataset.id;

      if(found.has(id)){
        infoEl.innerHTML = '你已經找到這個碳排來源了，可以繼續找下一個。';
        return;
      }

      found.add(id);
      item.classList.add('found');
      infoEl.innerHTML = carbonInfo[id];
      render();
    });
  });

  render();
}

function resetFindGame(){
  const items = document.querySelectorAll('.game-item');
  items.forEach(i=>i.classList.remove('found'));

  const p = getProgress();
  p.findCarbonDone = false;
  p.foundCount = 0;
  p.foundItems = [];
  saveProgress(p);

  const countEl = document.getElementById('foundCount');
  const progressEl = document.getElementById('findProgress');
  const infoEl = document.getElementById('findInfo');

  if(countEl) countEl.textContent = '0';
  if(progressEl) progressEl.style.width = '0%';
  if(infoEl) infoEl.innerHTML = '請先點選場景中的物件，找出主要碳排來源。';

  initFindGame();
}

let dragged = null;

function initDragDrop(){
  const draggables = document.querySelectorAll('.draggable');
  const zones = document.querySelectorAll('.dropzone');
  if(!draggables.length) return;

  draggables.forEach(item=>{
    item.addEventListener('dragstart', ()=>{
      dragged = item;
    });
  });

  zones.forEach(zone=>{
    zone.addEventListener('dragover', e=>{
      e.preventDefault();
      zone.classList.add('over');
    });

    zone.addEventListener('dragleave', ()=>{
      zone.classList.remove('over');
    });

    zone.addEventListener('drop', e=>{
      e.preventDefault();
      zone.classList.remove('over');
      if(dragged) zone.appendChild(dragged);
    });
  });

  // 頁面載入時，若已完成則顯示下一關按鈕
  const p = getProgress();
  if (p.classifyDone) {
    const nextActionEl = document.getElementById('nextLevelAction');
    if(nextActionEl) nextActionEl.style.display = 'block';
  }
}

function checkClassification(){
  const zones = document.querySelectorAll('.dropzone');
  const fb = document.getElementById('classificationFeedback');
  let total = 0;
  let correct = 0;
  
  const p = getProgress();
  // 清除此單元舊的歷史紀錄，準備寫入最新狀態
  p.allQuizData.history = p.allQuizData.history.filter(h => h.unit !== 'basics');

  zones.forEach(zone=>{
    const zoneName = zone.dataset.zone;
    zone.querySelectorAll('.draggable').forEach(item=>{
      total += 1;
      const itemName = item.textContent;
      const itemType = item.dataset.type;
      const isCorrect = (itemType === zoneName);
      
      // 2. 修正計分：僅當正確時增加
      if (isCorrect === true) {
        correct += 1;
      }
      
      p.allQuizData.history.push({
        unit: 'basics',
        index: total,
        q: itemName,
        userSelection: zoneName,
        correctAnswer: itemType,
        isCorrect: isCorrect,
        feedback: isCorrect ? '分類正確！' : `${itemName} 應該屬於「${itemType}」階段的碳排來源。分類正確有助於釐清減碳方向。`
      });
    });
  });

  fb.classList.add('show');
  
  // 更新全局分數
  p.allQuizData.scores.basics = correct;
  p.classifyDone = true;
  saveProgress(p);

  if(correct === total && total > 0){
    fb.className = 'feedback ok show';
    fb.innerHTML = '全對！你已經掌握原料、運輸、製作、銷售四種分類邏輯，完成第二關。';
    // [修正 1. 單元跳轉按鈕] 顯示下一單元跳轉按鈕
    const nextActionEl = document.getElementById('nextLevelAction');
    if(nextActionEl) nextActionEl.style.display = 'block';
  }else{
    fb.className = 'feedback bad show';
    fb.innerHTML = `你目前答對 ${correct} / ${total}。小提醒：咖啡豆採購屬於原料、配送車屬於運輸、咖啡機與冷氣屬於製作、外帶杯屬於銷售。`;
  }

  // 無論對錯，只要使用者完成作答並提交檢查，就推進進度
  p.classifyDone = true;

  saveProgress(p);
  updateGlobalProgress();
}

function resetClassification(){
  location.reload();
}

const quizData = [
  {
    q:'情境 1：店裡想更換外帶杯策略，哪一個做法通常更有助於減碳？',
    options:[
      {text:'維持大量一次性包材使用，讓流程最方便', ok:false, reason:'這會造成高碳排：一次性包材的製造與廢棄處理會產生大量碳排，且無法進入循環系統，長期下來對環境與成本都是負擔。<br><br>👉 建議思維：試著思考如何從源頭減少包材使用，例如提供自備杯簡單的優惠誘因。'},
      {text:'鼓勵自備杯，並逐步減少不必要的包材', ok:true, reason:'非常正確！從源頭減少一次性包材的使用，能最直接有效地降低廢棄物與製造端帶來的碳排，同時也有助於培養顧客的永續意識。'},
      {text:'多加一層外包裝，讓杯子看起來更精緻', ok:false, reason:'這會造成高碳排：多一層包裝等於多消耗一次資源，不但增加採購成本，製造與處理這些多餘包裝的碳排也會大幅增加。<br><br>👉 建議思維：減碳的關鍵在於「減少不必要」，精緻感可透過好的設計或圖案，而非增加實體包材層數來達成。'}
    ]
  },
  {
    q:'情境 2：如果要改善原料配送的碳排，哪一個方向較合理？',
    options:[
      {text:'增加小量多次配送，讓庫存更好看', ok:false, reason:'這會造成高碳排：小量多次會大幅增加物流車輛的往返趟次，運輸過程燃燒的燃油是咖啡廳間接碳排的重點來源。<br><br>👉 建議思維：可以想想如何讓運輸更有效率，例如合併叫貨、提升單次補貨量。'},
      {text:'規劃更有效率的補貨頻率，減少不必要配送', ok:true, reason:'完全正確！透過精準的庫存管理與穩定的叫貨頻率，能有效減少物流車趟次，直接降低運輸過程造成的碳排（碳足跡）。'},
      {text:'不考慮距離，只看最低單價', ok:false, reason:'這會造成高碳排：單價最低的原料如果來自極遠的地方，長途運輸所產生的碳排會非常驚人，未來甚至可能因碳費而增加隱藏成本。<br><br>👉 建議思維：採購時建議將「產地距離」與「配送效率」一併納入決策考量。'}
    ]
  },
  {
    q:'情境 3：以下哪個比較符合門市減碳方向？',
    options:[
      {text:'冷氣與照明整天維持最高運轉，不做調整', ok:false, reason:'這會造成高碳排：長時間高負載運轉會白白浪費許多電力，而電力使用正是門市碳排的大宗來源。<br><br>👉 建議思維：試著依照營運的尖峰、離峰時段做彈性調整，減少無謂耗能。'},
      {text:'定期檢查設備效率，離峰時調整不必要的用電', ok:true, reason:'正確觀念！維持設備高效率與依照尖離峰彈性調整用電，是門市中最容易執行、也最能立刻看到電費與碳排雙雙下降的方法。'},
      {text:'設備老舊也先不管，只要還能用就好', ok:false, reason:'這會造成高碳排：老舊設備通常能源轉換效率極差，運作同樣的時間卻會消耗更多電力，反而會讓電費與碳排飆高。<br><br>👉 建議思維：定期保養與適時汰換高耗能老舊設備，才是降低長期營運成本的長遠之計。'}
    ]
  }
];

let quizIndex = 0;
let quizScore = 0;

function initQuiz(isReset = false){
  const qBox = document.getElementById('quizQuestion');
  if(!qBox) return;
  
  const quizBox = document.getElementById('quizBox');
  const summaryCard = document.getElementById('quizSummaryCard');
  if (quizBox) quizBox.style.display = 'block';
  if (summaryCard) summaryCard.style.display = 'none';

  const p = getProgress();
  // [修正 4. 除錯要求] 移除無條件的 reset，只有在明確傳遞 isReset 時才清空資料
  if (isReset) {
    p.quizCompletedCount = 0;
    p.quizScore = 0;
    p.quizHistory = [];
    p.quizDone = false;
    saveProgress(p);
  }
  
  quizIndex = p.quizCompletedCount || 0;
  
  // [修正 1. 重設分數初始值] 
  // 嚴格依據「真正的歷史作答紀錄」來還原目前分數，杜絕幽靈舊分數
  quizScore = 0;
  if (p.quizHistory && p.quizHistory.length > 0) {
    for (let i = 0; i < quizIndex; i++) {
      if (p.quizHistory[i] && p.quizHistory[i].isCorrect === true) {
        quizScore += 1;
      }
    }
  }
  
  renderQuiz();
}

function renderQuiz(){
  const qBox = document.getElementById('quizQuestion');
  const optBox = document.getElementById('quizOptions');
  const fb = document.getElementById('quizFeedback');
  const scoreEl = document.getElementById('quizScore');
  const item = quizData[quizIndex];

  fb.className = 'feedback';
  fb.innerHTML = '';
  fb.style.display = 'none';

  // 確保或建立「下一題」按鈕
  let nextBtn = document.getElementById('quizNextBtn');
  if(!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'quizNextBtn';
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = '下一題';
    nextBtn.style.marginTop = '16px';
    nextBtn.onclick = () => {
      quizIndex += 1;
      
      // [修正跳轉邏輯]：點擊下一題時，必須儲存目前的題號進度，重整才不會錯亂
      const p = getProgress();
      p.quizCompletedCount = quizIndex;
      saveProgress(p);
      
      renderQuiz();
    };
    fb.parentNode.insertBefore(nextBtn, fb.nextSibling);
  }
  nextBtn.style.display = 'none'; // 初始隱藏

  if(!item){
    // 題目作答完畢，呼叫結算頁面渲染函數
    showQuizSummary();
    return;
  }

  qBox.innerHTML = `<h3>${item.q}</h3>`;
  scoreEl.textContent = quizScore;
  optBox.innerHTML = '';

  // 隨機打亂選項 (Fisher-Yates shuffle 概念)
  const shuffledOptions = [...item.options].sort(() => Math.random() - 0.5);

  shuffledOptions.forEach(opt=>{
    const btn = document.createElement('button');
    btn.className = 'quiz-option';
    btn.textContent = opt.text;
    btn.onclick = ()=> {
      // [修正 3. 防止重複加分] 選取後將所有按鈕禁用 (disabled)，防止同題狂點重複觸發
      const allBtns = optBox.querySelectorAll('.quiz-option');
      allBtns.forEach(b => {
        b.disabled = true;
        b.style.opacity = '0.6';
        b.style.cursor = 'not-allowed';
      });
      btn.style.opacity = '1'; // 保持選擇的按鈕亮起

      // [修正 2. 嚴格檢查加分觸發條件] 必須是明確的 true 才能加分
      if (opt.ok === true) {
        quizScore += 1;
      }

      // [修正 2. 保留作答紀錄] 存入 quizHistory
      const p = getProgress();
      p.quizScore = quizScore; // 即時儲存最新分數
      p.quizHistory = p.quizHistory || [];
      p.quizHistory[quizIndex] = {
        q: item.q,
        userSelection: opt.text,
        isCorrect: opt.ok,
        feedback: opt.reason
      };
      saveProgress(p);

      fb.className = 'feedback ' + (opt.ok ? 'ok show' : 'bad show');
      fb.style.display = 'block';
      fb.style.padding = '16px';
      fb.style.borderRadius = '12px';
      fb.style.marginTop = '16px';
      
      if (opt.ok) {
        fb.style.backgroundColor = '#e8f5e9'; // 正確：淺綠卡片
        fb.style.color = '#2e7d32';
        fb.innerHTML = `<strong>✅ 答對了！</strong><br><br>${opt.reason}`;
      } else {
        fb.style.backgroundColor = '#fff3e0'; // 錯誤：淺橘/紅色卡片
        fb.style.color = '#e65100';
        fb.innerHTML = `<strong>❌ 這題可以再想一下。</strong><br><br>${opt.reason}`;
      }

      // [修正 4. 顯示與數據同步] 即時將變數數值推至 UI 顯示
      scoreEl.textContent = quizScore;
      nextBtn.style.display = 'inline-block'; // 顯示「下一題」按鈕
    };
    optBox.appendChild(btn);
  });
}

// ========== 實戰方案結算與錯題回顧功能 ==========
function showQuizSummary() {
  const quizBox = document.getElementById('quizBox');
  const sCard = document.getElementById('quizSummaryCard');
  const sContent = document.getElementById('quizSummaryContent');
  const nextActionEl = document.getElementById('nextLevelAction');

  // 切換 UI 顯示狀態
  if (quizBox) quizBox.style.display = 'none';
  if (sCard) sCard.style.display = 'block';
  if (nextActionEl) nextActionEl.style.display = 'block'; // 顯示進入下一單元按鈕

  const p = getProgress();
  p.quizDone = true;
  p.quizScore = quizScore;
  p.quizTotal = quizData.length; // 儲存總題數供最終結算
  saveProgress(p);
  updateGlobalProgress();

  const qHistory = p.quizHistory || [];
  const totalQuestions = quizData.length;

  let html = `<p style="font-size:1.2rem; text-align:center; color:#5d4037;">總得分：<strong style="font-size:1.8rem; color:#4caf50;">${quizScore} / ${totalQuestions} 題</strong></p>`;

  // 篩選出錯誤的題目，並保留原始 index 以利查找正確答案
  const wrongQuizzes = qHistory.map((q, idx) => ({...q, originalIndex: idx})).filter(q => q && !q.isCorrect);

  if (wrongQuizzes.length > 0) {
    html += `<div style="margin-top: 24px;">
      <h4 style="color: #d84315;">🔍 錯題回顧與重點整理</h4>
      <div style="display:flex; flex-direction:column; gap:16px;">`;

    wrongQuizzes.forEach((ans) => {
      const correctOpt = quizData[ans.originalIndex].options.find(o => o.ok).text;
      html += `<div style="padding: 16px; border-left: 5px solid #ff9800; background:#fff3e0; border-radius: 4px 8px 8px 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <strong style="color:#5d4037; font-size: 1.1rem; display:block; margin-bottom: 10px;">題目：${ans.q}</strong>
        <div style="color:#d32f2f; font-size:0.95rem; margin-bottom: 6px;">❌ 你選擇了：${ans.userSelection}</div>
        <div style="color:#2e7d32; font-size:0.95rem; margin-bottom: 14px; font-weight: bold;">✅ 正確解答：${correctOpt}</div>
        <div style="padding: 12px; background: #e8f5e9; border-radius: 8px; color:#2e7d32; font-size:0.95rem; line-height: 1.5;">
          <strong>💡 解析：</strong><br>${ans.feedback}
        </div>
      </div>`;
    });
    html += `</div></div>`;
  } else {
    html += `<div style="margin-top: 24px; padding: 24px; background: #e8f5e9; border-radius: 12px; color: #2e7d32; text-align: center; font-size: 1.1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
      🎉 太棒了！你完美掌握了所有實戰減碳策略，完全沒有錯題！
    </div>`;
  }

  sContent.innerHTML = html;
}

// ========== 單元 5：行動清單互動系統 ==========
const checklistData = [
  { cat: '設備選擇', q: '定期檢查冷藏設備與冷氣效率，避免不必要耗電', isGood: true, reason: '提升設備效率、避免浪費用電，是很實際的減碳方法。' },
  { cat: '包裝與銷售', q: '為了方便流程，大量增加一次性包材使用', isGood: false, reason: '一次性包材越多，通常代表更多資源消耗與碳足跡。' },
  { cat: '包裝與銷售', q: '鼓勵顧客自備杯，並提供簡單優惠', isGood: true, reason: '鼓勵自備杯可以從源頭大幅減少一次性用品使用。' },
  { cat: '營運與物流', q: '增加小量多次配送，讓補貨更頻繁', isGood: false, reason: '增加配送次數通常會大幅提高運輸相關的間接碳排。' },
  { cat: '營運與物流', q: '重新規劃原料採購與配送頻率，減少不必要運輸', isGood: true, reason: '精準優化採購與配送頻率，有助於降低物流燃料與碳排。' },
  { cat: '設備選擇', q: '尖峰與離峰時段都讓設備維持最高運轉，不做調整', isGood: false, reason: '不分時段讓設備高負載運轉，容易造成不必要的電力浪費。' },
  { cat: '營運與物流', q: '在店內向顧客傳達減碳作法與品牌永續理念', isGood: true, reason: '對顧客傳達永續理念，有助於建立品牌形象與推動共同行動。' },
  { cat: '設備選擇', q: '設備老舊也沒關係，只要還能用就先不管', isGood: false, reason: '老舊設備能源轉換效率極差，長期下來反而會消耗更多電費與排碳。' }
];

let chkIndex = 0;
let chkAnswers = []; // 儲存使用者的作答紀錄

function initChecklist(isReset = false) {
  const qCard = document.getElementById('checklistCard');
  const sCard = document.getElementById('checklistSummaryCard');
  if(!qCard) return;

  const p = getProgress();
  // [修正 4. 除錯要求] 僅在按下「重新挑戰」按鈕時才執行 reset
  if (isReset || !p.shuffledChecklist) { // 若尚未有隨機題庫也需初始化
    p.checklistCompletedCount = 0;
    p.checklistDone = false;
    p.checklistScore = 0; // 重置時歸零
    p.checklistTotal = 0;
    p.chkAnswers = [];
    p.shuffledChecklist = shuffleArray([...checklistData]); // 對題庫進行深拷貝並隨機洗牌
    saveProgress(p);
  }

  qCard.style.display = 'block';
  sCard.style.display = 'none';

  // 取出歷史紀錄，落實 Data Persistence
  chkIndex = p.checklistCompletedCount || 0;
  chkAnswers = p.chkAnswers || [];

  renderChecklist();
}

// 修正 3：建立獨立的 updateChecklistProgress 函數
function updateChecklistProgress() {
  const pBar = document.getElementById('checklistProgressBar');
  // This function is no longer used as the progress bar was removed from HTML.
  // Keeping it to avoid breaking old calls, but it does nothing.
  // if (!pBar) return;
  
  // const totalQuestions = checklistData.length;
  // const pct = Math.floor((chkIndex / totalQuestions) * 100);
  // pBar.style.width = pct + '%';
}

function renderChecklist() {
  const qBox = document.getElementById('checklistQBox');
  const optBox = document.getElementById('checklistOptions');
  const fb = document.getElementById('checklistFeedback');

  // 取得洗牌後的題庫，確保讀取的是打亂後的題目順序
  const p = getProgress();
  const currentChecklist = p.shuffledChecklist || checklistData;
  const totalQuestions = currentChecklist.length;

  // 4. 100% 的唯一條件：當點擊最後一題的下一題進入結算頁面時，進度條才會被推滿至 100%
  if (chkIndex >= totalQuestions) {
    showChecklistSummary(); // 100% 完成，進入結算
    const nextActionEl = document.getElementById('nextLevelAction');
    if(nextActionEl) nextActionEl.style.display = 'block';
    return;
  }

  const item = currentChecklist[chkIndex]; // 改為從洗牌後的陣列抽取題目
  qBox.innerHTML = `<h4 style="color:#7a5a28;">題目 ${chkIndex + 1} / ${totalQuestions} ｜ 類別：${item.cat}</h4>
                    <p style="font-size: 1.1rem; font-weight: bold; color: #4e342e;">行動：${item.q}</p>`;
  optBox.innerHTML = '';
  fb.style.display = 'none';

  let nextBtn = document.getElementById('chkNextBtn');
  if(!nextBtn) {
    nextBtn = document.createElement('button');
    nextBtn.id = 'chkNextBtn';
    nextBtn.className = 'btn btn-primary';
    nextBtn.textContent = '下一題';
    nextBtn.style.marginTop = '16px';
    nextBtn.onclick = () => {
      chkIndex++;
      const p = getProgress();
      p.checklistCompletedCount = chkIndex;
      saveProgress(p);
      renderChecklist();
    };
    fb.parentNode.insertBefore(nextBtn, fb.nextSibling);
  }
  nextBtn.style.display = 'none';

  const btnY = document.createElement('button');
  btnY.className = 'quiz-option';
  btnY.textContent = '✅ 這是正確的減碳行動';
  
  const btnN = document.createElement('button');
  btnN.className = 'quiz-option';
  btnN.textContent = '❌ 這會增加碳排或耗能';

  const handleAnswer = (userSaysGood, btn) => {
    // 禁用選項避免重複點選
    btnY.disabled = true; btnN.disabled = true;
    btnY.style.opacity = '0.5'; btnN.style.opacity = '0.5';
    btn.style.opacity = '1';

    // 確保 isCorrect 為嚴格的布林值
    const isCorrect = (userSaysGood === item.isGood === true);
    
    // 1. 強制即時紀錄答題狀態 (Immediate State Update)
    chkAnswers[chkIndex] = { 
      questionId: chkIndex,
      q: item.q,
      cat: item.cat,
      userChoice: userSaysGood ? '這是正確的減碳行動' : '這會增加碳排或耗能',
      isCorrect: isCorrect, 
      feedback: item.reason 
    };
    
    p.chkAnswers = chkAnswers;
    p.checklistCompletedCount = chkIndex; // Also save progress here
    saveProgress(p);

    fb.style.display = 'block';
    fb.style.padding = '16px';
    fb.style.borderRadius = '12px';
    
    if (isCorrect) {
      fb.style.backgroundColor = '#e8f5e9';
      fb.style.color = '#2e7d32';
      fb.innerHTML = `<strong>👍 觀念正確！</strong><br><br>${item.reason}`;
    } else {
      fb.style.backgroundColor = '#fff3e0';
      fb.style.color = '#e65100';
      fb.innerHTML = `<strong>💡 這裡有個盲點！</strong><br><br>${item.reason}`;
    }
    nextBtn.style.display = 'inline-block';
  };

  btnY.onclick = () => handleAnswer(true, btnY);
  btnN.onclick = () => handleAnswer(false, btnN);

  // 隨機排列「正確/不正確」按鈕避免猜題習慣
  if(Math.random() > 0.5) {
    optBox.appendChild(btnY); optBox.appendChild(btnN);
  } else {
    optBox.appendChild(btnN); optBox.appendChild(btnY);
  }
}

function showChecklistSummary() {
  document.getElementById('checklistCard').style.display = 'none';
  const sCard = document.getElementById('checklistSummaryCard');
  sCard.style.display = 'block';
  const sContent = document.getElementById('checklistSummaryContent');

  const p = getProgress();
  const quizHistory = p.chkAnswers || [];

  // 5. 完整性驗證：在控制台輸出整個 quizHistory，確保紀錄完整寫入
  console.log('=== Action Checklist History ===', quizHistory);

  // 3. 重新校對總分計算法
  const correctQuestions = quizHistory.filter(item => item && item.isCorrect === true);
  const totalCorrect = correctQuestions.length;
  const totalQuestionsCount = quizHistory.length;

  const catStats = {};
  
  // 統計分項得分
  quizHistory.forEach(ans => {
    if (!ans) return;
    if (!catStats[ans.cat]) catStats[ans.cat] = { correct: 0, total: 0 };
    catStats[ans.cat].total++;
    if (ans.isCorrect === true) {
      catStats[ans.cat].correct++;
    }
  });

  const finalScore = Math.round((totalCorrect / totalQuestionsCount) * 100) || 0;
  let html = `<p style="font-size:1.2rem; text-align:center; color:#5d4037;">總得分：<strong style="font-size:1.8rem; color:#4caf50;">${finalScore} 分</strong> (${totalCorrect}/${totalQuestionsCount} 題)</p>`;

  // 使用 CSS 繪製分項成績的長條圖
  html += `<div style="margin: 24px 0; padding: 16px; background: #fff8e1; border-radius: 12px;">
            <h4 style="margin-top:0; color:#5d4037;">各面向表現分析</h4>`;
  for (const [cat, stat] of Object.entries(catStats)) {
    const pct = Math.round((stat.correct / stat.total) * 100);
    const color = pct === 100 ? '#4caf50' : (pct >= 50 ? '#ffb300' : '#e53935');
    const msg = pct === 100 ? '你在這方面表現優異！' : (pct >= 50 ? '觀念不錯，但可多考慮細節' : '這部分的觀念需要再加強喔');
    
    html += `
      <div style="margin-bottom: 16px;">
        <div style="display:flex; justify-content: space-between; font-size: 0.95rem; margin-bottom: 6px; color:#4e342e; font-weight:bold;">
          <span>${cat} (${stat.correct}/${stat.total})</span>
          <span style="color:${color};">${msg}</span>
        </div>
        <!-- 長條圖底部 -->
        <div style="width: 100%; height: 12px; background: #e0e0e0; border-radius: 6px; overflow: hidden;">
          <!-- 填滿的進度 -->
          <div style="width: ${pct}%; height: 100%; background: ${color};"></div>
        </div>
      </div>
    `;
  }
  html += `</div>`;

  // 2. 修正錯誤清單的過濾邏輯 (嚴格要求為 false 才被視為錯題)
  const wrongQuestions = quizHistory.filter(item => item && item.isCorrect === false);
  if (wrongQuestions.length > 0) {
    html += `<div style="margin-top: 24px;">
      <h4 style="color: #d84315;">🔍 錯題回顧與重點整理</h4>
      <div style="display:flex; flex-direction:column; gap:12px;">`;
    wrongQuestions.forEach((ans, idx) => {
      html += `<div style="padding: 12px; border-left: 4px solid #ff9800; background:#fff3e0; border-radius: 4px 8px 8px 4px;">
        <strong style="color:#5d4037;">盲點 ${idx+1}：${ans.q}</strong><br>
        <span style="color:#d32f2f; font-size:0.95rem; margin-top:6px; display:inline-block;">❌ 你選擇了：${ans.userChoice}</span><br>
        <div style="padding: 10px; background: #e8f5e9; border-radius: 8px; color:#2e7d32; font-size:0.95rem; line-height: 1.5; margin-top: 8px;">
          <strong>💡 解析：</strong><br>${ans.feedback}
        </div>
      </div>`;
    });
    html += `</div></div>`;
  } else {
    html += `<div style="margin-top: 24px; padding: 20px; background: #e8f5e9; border-radius: 12px; color: #2e7d32; text-align: center;">
      🎉 太棒了！你完美掌握了所有的減碳行動觀念，完全沒有錯題！
    </div>`;
  }

  sContent.innerHTML = html;

  // 存取並更新全域進度
  p.checklistDone = true;
  saveProgress(p);
  updateGlobalProgress();
}

function updateGlobalProgress(){
  const p = getProgress();
  const keys = ['homeIntroDone','findCarbonDone','classifyDone','quizDone','checklistDone'];
  const done = keys.filter(k=>p[k]).length;
  // 使用 Math.round 四捨五入，並用 Math.min 確保最大值為 100%
  const pct = Math.min(Math.round((done / keys.length) * 100), 100);

  const globalBar = document.getElementById('globalProgress');
  const globalText = document.getElementById('globalProgressText');

  if(globalBar) globalBar.style.width = pct + '%';
  if(globalText){
    if(pct === 100) {
      globalText.textContent = `🎉 恭喜！你已完成所有 ${keys.length} 個重點學習任務，整體進度 100%！互動測驗總分數：${p.quizScore || 0} 分。`;
    } else {
      globalText.textContent = `目前完成 ${done} / ${keys.length} 個重點學習任務，進度 ${pct}%。互動測驗分數：${p.quizScore || 0} 分。`;
    }
  }
}

function initReveal(){
  const els = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(entries=>{
    entries.forEach(entry=>{
      if(entry.isIntersecting){
        entry.target.classList.add('show');
      }
    });
  }, {threshold:.12});

  els.forEach(el=>io.observe(el));
}

document.addEventListener('DOMContentLoaded', ()=>{
  setActiveNav();
  initReveal();
  initFindGame();
  initDragDrop();
  initQuiz();
  initChecklist(); // 啟動清單測驗
  updateGlobalProgress();
});