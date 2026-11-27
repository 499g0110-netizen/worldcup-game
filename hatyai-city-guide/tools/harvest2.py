import json, sys, time, urllib.parse, urllib.request
UA="hatyai-3d-city-guide-personal-project/1.0"
def get(q, extra=""):
    url="https://nominatim.openstreetmap.org/search?format=jsonv2&polygon_geojson=1&extratags=1&limit=15&q=%s%s"%(urllib.parse.quote(q),extra)
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={"User-Agent":UA}),timeout=40) as r: return json.load(r)
        except Exception: time.sleep(3)
    return []
VB="&viewbox=100.34,7.08,100.56,6.88&bounded=1"
qs=["สวนสาธารณะเทศบาลนครหาดใหญ่","สวนสาธารณะ หาดใหญ่","Hat Yai Municipal Park","สวนสาธารณะ","ทางวิ่ง","runway","taxiway","apron","ทางรถไฟ","railway","โรงแรมลีการ์เดนส์ พลาซ่า","โรงแรมเซ็นทารา","โรงแรมรีเจ้นท์","หอนาฬิกา","ตลาดน้ำ","วัดหาดใหญ่ใน","วัดโคกสมานคุณ","ห้างสรรพสินค้า","โรงแรม","โรงเรียน","วัด","ธนาคาร","สถานีขนส่ง","Hat Yai Airport Hotel","เซ็นทรัล หาดใหญ่","หาดใหญ่ ฟิวเจอร์พาร์ค","สนามกีฬา","สนามบิน","อ่างเก็บน้ำ","แม่น้ำ","ถนนกาญจนวนิช","ถนนราษฎร์อุทิศ","ถนนศุภสารรังสรรค์"]
res={}
for i,q in enumerate(qs):
    res[q]=get(q,VB); print(i+1,len(qs),q,len(res[q]),flush=True)
    json.dump(res,open(sys.argv[1],"w"),ensure_ascii=False); time.sleep(1.25)
print("DONE")
