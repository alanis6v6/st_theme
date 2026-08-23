# Gilded Desire

SillyTavern 擴充，搭配角色卡《風停之前，誰先說愛我》使用：只在這張卡的聊天裡生效，把聊天欄位加寬、拿掉酒館原本的訊息對話框（改成用卡片自己的金色雙框），並把上方工具列、輸入框、Quick Reply 按鈕都換成搭配的深酒紅＋金色配色。切到別的角色聊天時會自動失效，不影響你平常用酒館的樣子。

## 安裝

1. 酒館左側選單 → **Extensions**（插頭圖示）→ **Install Extension**
2. 貼上這個 repo 的網址：`https://github.com/alanis6v6/st_theme`
3. 安裝完成後，在 Extensions 清單裡確認「Gilded Desire」是**啟用**狀態
4. 打開《風停之前，誰先說愛我》這張卡的聊天，畫面會自動套用主題；切到別的角色聊天會自動變回原本樣子

## 運作原理

- `style.css` 會在擴充啟用的當下就整個載入（這是酒館 `manifest.css` 的載入方式），但裡面**每一條規則都寫在 `body.gnl-theme-active` 底下**，預設什麼都不會發生。
- `index.js` 監聽酒館的 `CHAT_CHANGED`／`APP_READY` 事件，每次切換聊天就檢查目前角色的名字是不是精確等於「風停之前，誰先說愛我」（角色卡的 `name` 欄位），是的話幫 `<body>` 加上 `gnl-theme-active`，不是的話拿掉——這就是為什麼主題只在這張卡生效，切到別的角色會自動失效。
- 聊天欄位加寬是覆寫酒館自己的 `--sheldWidth` CSS 變數；卡片本身（`.rt-shell`／`.rt-frame-head`／`.rt-footer` 等）的寬度是 regex 輸出裡直接寫死的行內樣式（原本是照手機聊天欄校準的 420px），所以額外用 `!important` 覆寫這些 class，讓卡片本身也跟著變寬，不會卡在舊的手機寬度、在加寬後的聊天欄裡兩側留一大片空白。
- 移除的只是酒館原本每則訊息自己的背景／邊框（`.mes`／`.mes_block`），角色名字、頭像、時間戳記、編輯／滑動等功能性 UI 都保留，不影響操作。

## v1.1：整個聊天室套上卡片的金框

- `#sheld`（整個聊天視窗，不只單則訊息）現在直接套用卡片自己 `.rt-frame` 那套外框：金色描邊＋內縮的金色細框＋再內縮一層酒紅雙線，四個角落還加上跟卡片一模一樣的手繪花紋（從卡片的 regex 樣式裡原樣擷取出來，做成四張互相鏡射的 SVG，分別擺在四個角）。這樣聊天室本身就是卡片外框的延伸，不會在卡片外面留一圈沒裝飾的底色。
- 插頭那排的抽屜圖示（`#top-bar` 收合時／`#top-settings-holder` 展開時）改成金色線條：預設就是金色，滑鼠移過去會變亮、浮起、外加一圈金光；點下去會有一個快速的按壓縮放回彈，點擊與滑過都看得出動畫。

若之後角色卡自己的 `.rt-frame` 配色（`style` 那個 regex 腳本）改了，記得同步改這裡 `#sheld` 那段背景圖用的十六進位色（花紋 SVG 是 data URI，寫死在 `style.css` 裡，改色要重新產生 base64）。

## 改了 `style.css` 卻完全沒變化？

在酒館裡點「更新擴充」之後畫面還是舊的，最常見的原因不是 CSS 寫錯，而是瀏覽器把 `style.css` 快取住了：`index.js` 重新抓到了新版，但 `<link>` 的網址完全沒變，瀏覽器就不會重新下載那份 CSS——手機／PWA 安裝版尤其明顯。

`index.js` 裡的 `bustStyleCache()` 會在載入時把這份主題自己的 `<link href="...style.css">` 加上 `?v=版本號`，強迫瀏覽器重新抓。**這代表以後只改 `style.css`、沒有同步把 `index.js` 最上面的 `VERSION` 常數也往上加一碼的話，快取還是不會被打破**——兩個檔案的版號要一起動，跟 `manifest.json` 的 `version` 保持一致。

如果照這樣更新、版號也對了，畫面還是沒變，依序排查：
1. 確認「Gilded Desire」在 Extensions 清單裡是**啟用**狀態，且版本號真的變成新的了（不是卡在舊版）。
2. 瀏覽器強制重新整理（電腦 Ctrl/Cmd+Shift+R；手機直接把分頁關掉重開，PWA 版可能要移除再重新加到主畫面）。
3. 打開瀏覽器開發者工具的 Console，執行 `document.body.classList.contains('gnl-theme-active')`——回傳 `false` 代表 `index.js` 判斷目前不是在這張卡的聊天裡，這種情況所有 CSS 都不會生效，跟 CSS 內容本身無關。

## v1.3：改用跟 st-brume 一樣的掛載方式

v1.2 以前 `index.js` 是用 `import { eventSource, event_types, getContext } from '../../../../script.js'` 直接匯入酒館核心模組，只靠 `CHAT_CHANGED`／`APP_READY` 兩個事件觸發 `body.gnl-theme-active`。實測發現：即使在 Console 直接呼叫 `SillyTavern.getContext()` 能正確讀到目前角色（`characterId`、`name` 都對得上 `TARGET_CHARACTER_NAME`），`document.body.classList.contains('gnl-theme-active')` 卻是 `false`——代表這兩個事件在該次操作流程裡沒有確實觸發到 `applyThemeState()`，跟角色名稱比對邏輯本身無關。

比對 [st-brume](https://github.com/lubiyu0307-prog/st-brume)（`sillytavern` 那個擴充的原始 fork 來源）的寫法後，改成同一套更耐用的掛法：
- 不再從 `script.js` 匯入，一律透過全域 `SillyTavern.getContext()` 取得（`st-brume` 的 `getContext()` 就是這樣寫的，不吃相對路徑）。
- 訂閱事件前先用 `.filter(Boolean)` 濾掉不存在的事件名稱，並多訂閱 `CHARACTER_EDITED`／`GROUP_UPDATED`，不是只有 `CHAT_CHANGED`／`APP_READY` 兩個。
- 加上 `setInterval(applyThemeState, 1000)` 當保底——不管哪個事件在特定情境下沒有確實觸發，最慢一秒內狀態就會自己校正回來，這也是 `st-brume` 自己用來維持即時狀態的做法。

`index.js` 的 `VERSION` 常數與 `manifest.json` 的 `version` 都同步升到 1.3.0，觸發前面提到的快取清除機制。

## v1.2：外框加大、跟裝置一起縮放

參考 [st-brume](https://github.com/lubiyu0307-prog/st-brume)（`sillytavern` 那個擴充的原始 fork 來源）的做法確認過：它處理裝置縮放全部用 `dvh`/`dvw`／`clamp()`／`env(safe-area-inset-*)`，沒有寫死的 px。之前 `#sheld` 外框的四個角花紋是寫死 `42px`，在酒館把 `--sheldWidth` 撐到接近 900px 的桌機上顯得太小；改成 `clamp(34px, 5.2vw, 64px)`，內縮線也從 `6px`／`10px` 改成 `clamp(8px,1.4vw,16px)`／`clamp(13px,2.1vw,24px)`——手機上跟卡片本身的花紋比例一致，桌機上跟著 `#sheld` 一起變大，不會顯得比例失調。外框本身不改變 `#sheld` 的尺寸或位置（它已經跟著酒館自己的 `--sheldWidth` 縮放），只是疊加在上面，所以外緣永遠貼著酒館原本的聊天邊界，不會多出一圈留白。另外給 `#chat` 補上跟外框同步縮放的內距，訊息一律留在雙圈內側，不會被花紋壓到或蓋住。

## v1.4：Chat Top Bar 那排、輸入框簡化、金屬花邊、斜體／花體字、全域開關

- 找到那排一直沒套上主題的列了：它其實不是這個擴充、也不是 `sillytavern`（黑森林）擴充畫的，而是官方擴充 [Chat Top Bar](https://github.com/SillyTavern/Extension-TopInfoBar)（`#extensionTopBar`）；[Memory Books](https://github.com/aikohanasaki/SillyTavern-MemoryBooks) 只是偵測到它存在時，把自己的「記憶書任務」按鈕（`#stmb-jobs-topbar`）插進去而已。因為 CSS 是照 ID 寫的，Chat Top Bar 沒裝的話這整段規則自然就是無作用，不需要額外判斷「有沒有裝」。
  - 隱藏原本的「Toggle sidebar」（`#extensionTopBarToggleSidebar`）與「Show connection profiles」（`#extensionTopBarToggleConnectionProfiles`）。
  - 用 CSS `order`（純排版，沒有搬動 DOM）把「記憶書任務」與「View chat files／檢視聊天檔案」（`#extensionTopBarChatManager`）拉到最左邊，接手原本兩顆按鈕的位置——就算沒裝 Memory Books，「檢視聊天檔案」自己也會補到最前面。
  - 整排套上跟頂部工具列一致的金色漸層底、金色線條圖示、hover 發光。
  - 點開「記憶書任務」抽屜（`#top_chat_stmb_jobs`）會看到另一組「金屬」配色（銀灰＋鉻白，`--gnl-metal-*` 變數），同一套四角花紋但換成冷色調——刻意跟底下的金＋酒紅主題分開，一眼就知道這是暫時跳出來的工作面板，不是聊天本身的一部分。
- 輸入框重新設計：`#send_form` 不再是一整個大方框，改成「有邊框的輸入框＋周圍是純圖示、沒有外框的按鈕」，訊息輸入框跟旁邊的圖示視覺上明確分開。
- 全站字體加了 `font-style: italic` 搭配 `font-synthesis: none`：英文字母／數字會自動套用 Cormorant Garamond 真正的斜體字（Google Fonts 有這個字重），中文因為那個字型沒有對應字符，會照原樣落到 Noto Serif TC 且**不會**被瀏覽器硬拉斜——不用另外判斷一段文字是不是英文，纯粹靠 Unicode 範圍自然分流。標題（`.popup h3/h4`、抽屜標題、記憶書任務標題）再疊一層 Tangerine 手寫花體字，同樣原理：標題裡的英文字會變成花體，中文字不受影響。
- 順手把常見的酒館通用元件也套進主題：`.popup`／`.menu_button`／`.text_pole`／`.drawer-content`。這是**廣泛但非全面**的第一輪——涵蓋最常見的共用元件，不是每個擴充各自的畫面；還有哪個角落沒套到，直接說是哪個面板，比照 `#extensionTopBar` 這樣個別點名處理。
- Extensions 設定頁新增「性別不是限制主題」收合區塊，裡面一個「套用到全域」開關——打開後不管目前是哪張角色卡的聊天都會套用主題，關掉則變回只認《性別不是限制，性吸引力才是》這張卡。設定存在 `extensionSettings.gnl_theme.applyGlobally`，跟酒館其他擴充設定一樣會存檔。

## v1.5：花邊搬到聊天記錄本身，外框只留素邊，輸入列圖示縮小

v1.1～v1.4 的花邊外框（雙圈線＋四角花紋）都是包在 `#sheld`（整個聊天面板，含頂部的 Chat Top Bar 那排、底部輸入列）外面。問題是 Chat Top Bar 跟輸入列都貼在 `#sheld` 的邊緣，花紋角落會直接疊到它們上面，兩邊都變得亂——花邊蓋住圖示，或圖示卡在花邊裡看不清楚。

改法：
- `#sheld` 現在只留**素面金色邊框**（就一條線＋陰影），不再有雙圈或角花紋。頂部工具列、Chat Top Bar、輸入列都貼著這條邊，不會被裝飾蓋到。
- 雙圈與四角花紋整組搬進 `#chat`（只有聊天記錄本身在捲動的那塊區域），跟其他兩排完全分開，不會再互相干擾。
- 技術細節：`#chat` 本身會捲動，如果沿用之前 `::before`／`::after` 偽元素做雙圈，捲動聊天記錄時那兩圈線也會跟著捲走。改用 `background-image`（四角花紋）＋`box-shadow`（雙圈效果，用兩層 inset 陰影模擬金線＋酒紅色帶，取代原本兩條各自獨立的線）——這兩種都是畫在元素自己的框上，不受內部捲動影響，花紋跟雙圈永遠貼在 `#chat` 可見範圍的四個角。
- 底部輸入列的圖示（`#leftSendForm`／`#rightSendForm` 底下的按鈕，含送出鍵）縮小到 `0.85em`，不再跟輸入框搶視覺。
- Extensions 清單裡「性別不是限制主題」自己的收合區塊，加了獨立的金色外框樣式（`#gnl_theme_settings`），這條規則**沒有**照慣例包在 `body.gnl-theme-active` 底下——因為套用到全域的開關本來就是要在「還沒在那張卡的聊天裡」時也看得到、按得到。

## v1.6：擴充功能清單樣式對齊、輸入框加大、記憶書面板可收合

- `#gnl_theme_settings`（自己在 Extensions 清單裡的收合區塊）之前直接蓋掉了 `background`／`border-radius`，把酒館原生那個「左上角有摺角」的深色藥丸狀外觀整個換成一塊平面矩形，跟清單裡其他項目長得不一樣。改成只疊加邊框顏色，不動背景與形狀，這樣看起來還是同一份清單裡的一員，只是邊框是金色。
- `#send_textarea` 加大：`min-height` 提到 `3.4em`、內距加寬、邊框從 1px 加粗到 2px——原本的邊框在預設高度下不夠顯眼，「美化」效果幾乎看不出來。
- 記憶書任務面板（`#top_chat_stmb_jobs`）加上可收合功能：`index.js` 幫面板標題加一顆小箭頭圖示，點標題整條就會收合／展開任務列表與操作按鈕列，只留標題／摘要。這是額外疊加在 Memory Books 原生結構上的行為，不是它本來就有的功能。

## v1.7：讓外框跟背景圖融合，不再像兩個分開的區塊

- 電腦版寬螢幕下，`#sheld`（900px 頂寬）置中浮在使用者自訂的背景圖上，左右兩側會露出完全沒處理過的照片，跟中間金框深色卡片看起來像互不相關的兩塊東西。加了一層固定在整個視窗、蓋在背景圖（`#bg1`，z-index -1）之上但在卡片（z-index 30）之下的暗色暈影（`body.gnl-theme-active::before`），把背景圖邊緣往酒紅／近黑加深，中央（卡片後面）留亮，讓露出來的背景讀作「卡片所在的昏暗房間」而不是一張無關的照片。
- `#sheld`／`#chat` 原本背景是完全不透明的 `--gnl-bg`，把酒館自己在 `#chat` 上內建的 `backdrop-filter: blur()` 整個蓋住、失去作用。改用新變數 `--gnl-bg-glass`（`color-mix()` 出來、九成不透明的同一個顏色）取代，讓模糊透出來的背景圖顏色能隱約滲進卡片邊緣，卡片跟房間場景在色調上才連得起來，而不是一塊完全不透光的深色板子疊在照片上。
- `#sheld` 的外陰影從單純貼邊的 drop shadow 加大成往外暈開很遠的酒紅／近黑光暈，讓金框邊緣跟外面的暗化背景圖之間有個漸層過渡，不是金線直接切齊一張照片的硬邊。

## v1.8：四角花紋改成只留左下、右下兩個角，換成新的花卉圖案

- 原本 `#chat` 四個角落用的是同一份手繪藤蔓花紋（一份 SVG 靠 CSS `transform: scale()` 鏡射成四份），現在改成兩份各自獨立設計的花卉 SVG，只放在左下、右下角，左上、右上角不再有任何花紋。
- 兩份 SVG 原始檔是白底＋深色實心填色路徑（掃描手繪稿轉出來的向量），拿掉白底、把填色從原本的深藍改成跟角落花紋同一組金色（`#c69b5f`，跟 `--gnl-corner` 一致），轉成 base64 內嵌到 `background-image` 裡，跟其他花紋一樣的做法。
- `background-position`／`background-size` 的清單長度跟著從 4 組角落縮成 2 組（只剩左下、右下），大小一樣用 `--gnl-frame-corner` 那個 `clamp()` 變數控制，跟外框其他部分一起隨螢幕縮放。

## v1.9：花紋放大 1.5 倍、輸入框跟外框之間補出間距

- `--gnl-frame-corner`（角落花紋的顯示尺寸）從 `clamp(34px, 5.2vw, 64px)` 放大到 `clamp(51px, 7.8vw, 96px)`，正好是 1.5 倍。花紋的錨點（`--gnl-frame-inset-1`，控制花紋離左邊/下邊多遠）沒有動，所以放大後只是往聊天記錄裡面多佔一點空間，不會偏移原本貼齊角落的位置。
- 輸入框（`#send_textarea`）自己有一圈金色邊框，但它外面的 `#form_sheld`／`#send_form` 原本是滿版寬度、跟 `#sheld` 之間完全沒有間距，導致輸入框自己的邊框直接貼上（甚至疊到）`#sheld` 最外層的金色邊框，看起來像缺了一段、不是完整的一圈。幫 `#form_sheld` 收窄寬度、加上左右置中的 margin 跟底部間距，讓輸入框跟外框之間空出一圈可以看到背景色的間隙，邊框才會整圈都顯示出來，跟 `#chat` 訊息區塊原本就有的內距概念一致。

## v1.10：改名為 Gilded Desire，換綁角色卡，花紋再放大、輸入列再縮小

- 主題改名：`manifest.json` 的 `display_name`、Extensions 清單裡自己的收合區塊標題（`index.js` 裡的 `<b>...</b>`）都從「性別不是限制主題」改成「Gilded Desire」。
- 換綁角色卡：`index.js` 的 `TARGET_CHARACTER_NAME` 從《性別不是限制，性吸引力才是》改成《風停之前，誰先說愛我》，主題現在只在這張新卡的聊天裡生效。
- `--gnl-frame-corner` 在 v1.9 的 `clamp(51px, 7.8vw, 96px)` 之上，先放大 2.5 倍到 `clamp(128px, 19.5vw, 240px)`，再放大 1.5 倍到 `clamp(192px, 29.3vw, 360px)`——累計是 v1.9 的 3.75 倍。花紋錨點（`--gnl-frame-inset-1`）一樣沒動,只是往聊天記錄裡面多佔更多空間。
- 輸入列（`#leftSendForm`／`#rightSendForm` 圖示、`#send_textarea`）再縮小一輪：圖示字級 `0.85em → 0.7em`，輸入框內距 `14px 16px → 10px 14px`、`min-height` `3.4em → 2.6em`——花紋放大後輸入列的可用空間變小，圖示跟輸入框太大會讓 `#send_textarea` 自己的金色邊框被擠到顯示不完整，縮小後邊框才能整圈顯示。

## 更新配色 / 卡片寬度

顏色變數集中在 `style.css` 最上面的 `body.gnl-theme-active { --gnl-*: ...; }` 區塊；卡片寬度覆寫在同一個檔案裡搜尋 `.rt-shell` 那一段。改完直接 commit push，酒館下次啟用擴充時會用新版本（`manifest.json` 有開 `auto_update`）。

若之後改了卡片名稱（`name` 欄位），記得同步改 `index.js` 裡的 `TARGET_CHARACTER_NAME`，否則主題會抓不到人。
