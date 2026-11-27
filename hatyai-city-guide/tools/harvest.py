import json, sys, time, urllib.parse, urllib.request
OUT = sys.argv[1]
UA = "hatyai-3d-city-guide-personal-project/1.0"
def get(q, extra=""):
    url = "https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&addressdetails=0&extratags=1&limit=40&q=%s%s" % (urllib.parse.quote(q), extra)
    for i in range(3):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=40) as r:
                return json.load(r)
        except Exception as e:
            time.sleep(3)
    return []
CENTER_VB = "&viewbox=100.452,7.022,100.490,6.988&bounded=1"
WIDE_VB   = "&viewbox=100.36,7.07,100.56,6.90&bounded=1"
jobs = []
# roads (Thai + English), central box
for n in ["ถนนนิพัทธ์อุทิศ 1","ถนนนิพัทธ์อุทิศ 2","ถนนนิพัทธ์อุทิศ 3","ถนนประชาธิปัตย์","ถนนธรรมนูญวิถี","ถนนเสน่หานุสรณ์","ถนนศุภสารรังสรรค์","ถนนเพชรเกษม","ถนนราษฎร์อุทิศ","ถนนราษฎร์ยินดี","ถนนจุติอุทิศ","ถนนกาญจนวนิช","ถนนรัฐการ","ถนนศรีภูวนารถ","ถนนนิพัทธ์สงเคราะห์","ถนนดวงจันทร์","ถนนช่วยเหลือ","ถนนพิพิธภักดี","ถนนสาครวิถี","ถนนแสงจันทร์","ถนนไทยบุรี","ถนนสุขุมวิท"]:
    jobs.append(("road:"+n, n, CENTER_VB))
for n in ["Niphat Uthit 1 Road","Niphat Uthit 2 Road","Niphat Uthit 3 Road","Prachathipat Road","Thamnoon Withi Road","Phetkasem Road Hat Yai","Kanchanawanit Road","Rattakan Road Hat Yai","Si Phunwanat Road","Sanehanusorn Road","Supasarnrangsan Road"]:
    jobs.append(("road:"+n, n+" Hat Yai", CENTER_VB))
# categories in central box
for c in ["hotel","shopping mall","department store","bank","hospital","temple","school","market","supermarket","restaurant","cinema","police","post office","university","bus station","parking","pharmacy","convenience store","fuel","cafe","museum","mosque","church","shrine","building","apartment","tower","office","clinic","hostel","guest house","night market","food court","plaza","square"]:
    jobs.append(("cat:"+c, c, CENTER_VB))
# landmarks (wide)
for n,q in [("lee_gardens_plaza","Lee Gardens Plaza Hat Yai"),("lee_gardens_hotel","Lee Gardens Hotel"),("centara","Centara Hat Yai"),("regency","The Regency Hotel Hat Yai"),("airport","Hat Yai International Airport"),("runway","Hat Yai Airport runway"),("airport_terminal","Hat Yai Airport terminal"),("station","Hat Yai Junction railway station"),("clock","Hat Yai Clock Tower"),("muni_park","Hat Yai Municipal Park"),("khlong_hae","Khlong Hae Floating Market"),("khlong_hae2","ตลาดน้ำคลองแห"),("kim_yong","Kim Yong Market"),("santisuk","Santisuk Market"),("diana","Diana Department Store Hat Yai"),("odean","Odean Mall Hat Yai"),("central","Central Festival Hat Yai"),("big_c","Big C Hat Yai"),("lotus","Lotus Hat Yai"),("psu","Prince of Songkla University Hat Yai"),("u_tapao","Khlong U-Tapao"),("u_tapao2","คลองอู่ตะเภา"),("hatyai_canal","คลองหาดใหญ่"),("kho_hong","Khao Kho Hong"),("tha_sala","Hat Yai Bus Terminal"),("hatyai_hospital","Hat Yai Hospital"),("songklanagarind","Songklanagarind Hospital"),("wat_hat_yai_nai","Wat Hat Yai Nai"),("tonk_sai","Hat Yai Tourist Police"),("green_world","Green World Hat Yai"),("sunshine","Hat Yai Walking Street"),("night_market_kanchana","Kanchanawanit Night Market Hat Yai"),("tesco","Tesco Lotus Hat Yai"),("royal_rail","Hat Yai Ratchaphruek")]:
    jobs.append(("lm:"+n, q, WIDE_VB if n not in ("lee_gardens_plaza","lee_gardens_hotel","centara","regency","kim_yong","santisuk") else ""))
res = {}
for i,(k,q,vb) in enumerate(jobs):
    res[k] = get(q, vb)
    print(i+1, len(jobs), k, len(res[k]), flush=True)
    json.dump(res, open(OUT,"w"), ensure_ascii=False)
    time.sleep(1.25)
print("DONE", flush=True)
