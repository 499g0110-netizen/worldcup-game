# 合艾 HAT YAI · 電影級 3D 城市導覽

單檔網頁（`index.html`，內含 Three.js，離線可開）。以李花園廣場酒店（Lee Gardens Plaza Hotel）為原點，依 OpenStreetMap 的**真實座標**由市中心向外導覽。

## 導覽站點（由近到遠）
| # | 地點 | 距離 | 資料來源 |
|---|------|------|----------|
| 1 | 李花園廣場酒店 / Centara | 0 m | OSM 輪廓與座標 |
| 2 | Lee Gardens 夜市（夜間才出現的攤販） | 70 m | 示意佈局（位置在酒店南側廣場） |
| 3 | 秋哥國際豬腳飯 | ~80 m | **OSM 查無此店，位置與外觀為示意** |
| 4 | 石板街與路邊小吃（Sanehanusorn Rd） | 160 m | OSM 道路中線 |
| 5 | 城市街頭（Thamnoon Withi Rd） | 260 m | OSM 道路 |
| 6 | Kim Yong 金永市場 | 320 m | OSM 市場輪廓 |
| 7 | 合艾火車總站 | 490 m | OSM 車站輪廓、軸線 |
| 8 | 鐘樓 / Wat Thawon Wararam | 670 m | OSM 座標 |
| 9 | Greenway Night Market | 2.0 km | OSM 市場輪廓 |
| 10 | Central Hat Yai | 2.0 km | OSM 輪廓 |
| 11 | Khlong Hae 水上市場 | 4.5 km | OSM 輪廓 |
| 12 | 帕普塔蒙空瑪哈拉大佛（พระพุทธมงคลมหาราช）+ 纜車站 | 5.8 km | OSM 座標與纜車站輪廓；佛像造型為示意 |
| 13 | 合艾國際機場 HDY | 11.6 km | OSM 機場範圍與航廈輪廓；跑道 08/26 方位由範圍推得 |

## 操作
- 空白鍵 播放/暫停　← → 上一站/下一站　E 自由探索　1/2/3 白天/黃昏/夜晚　0 自動　H 隱藏介面　F 全螢幕
- 滾輪或點時間軸可拖曳進度；右下 ♪ 開關環境音。

## 重要說明（誠實揭露）
- 外部資料只能從 Nominatim 取得（Overpass / Google 不可用），因此**只有路網、河道、機場、車站、市場、商場等具名物件是 OSM 真實形狀**；一般街屋由程式沿真實道路與街廓補齊，**不是逐棟測繪**。
- 建築高度、立面（李花園的綠色橫帶、Centara 的深淺面板、愛心窗燈等）依使用者提供的照片估計重建，非精確測繪。
- 鐵軌為沿車站軸線的直線示意。

## 重新建置
```bash
npm install
npm run build        # 產生單檔 index.html
```
`tools/` 內為 OSM 資料抓取腳本，`data/` 為原始回應，`src/city.json` 為整理後的資料。
地圖資料 © OpenStreetMap contributors (ODbL)。
