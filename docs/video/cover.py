# Paint clean text over the on-screen passages that must not be published, blur where the page scrolls. Times are body-timeline seconds.
import io, subprocess, json
F="/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"; FONT="/System/Library/Fonts/Helvetica.ttc"
tl=json.load(open("timeline.json")); d=tl[12][1]-83.6  # shift of everything after the removed scroll segment
n=[0]
def tf(text):
    n[0]+=1; p=f"c{n[0]}.txt"; io.open(p,'w',encoding='utf-8').write(text); return p
def box(x,y,w,h,color,a,b): return f"drawbox=x={x}:y={y}:w={w}:h={h}:color={color}:t=fill:enable='between(t,{a},{b})'"
def txt(text,x,y,size,color,a,b): return f"drawtext=fontfile={FONT}:textfile={tf(text)}:x={x}:y={y}:fontsize={size}:fontcolor={color}:enable='between(t,{a},{b})'"
NOTE1="You have $111.17 left after these two. Put the zinc cream on at every diaper change and leave the skin open to air a few minutes; if the rash spreads,"
NOTE2="blisters, or fever starts, call the pediatrician the same day. Your diapers cover about 29 more days, so nothing else is urgent right now."
def note(y,a,b): return [box(200,y-4,1040,66,"white",a,b), txt(NOTE1,206,y,15,"0x6c7478",a,b), txt(NOTE2,206,y+20,15,"0x6c7478",a,b)]
WHICH=["Go by weight, not by age on the box. Size 3 usually fits about 16 to 28","pounds; a smaller baby may still be in size 2 (12 to 18 pounds) and that is","fine. Size up when you see red marks at the thighs, blowouts up the back,","or the tabs pulling to the very last edge."]
PICK=["At 6 diapers a day you need about 180 a month, so the best real buy is","Mama Bear Size 3, 168 count for $24.69 on Amazon, about 15 cents a","diaper, and Luvs 120 count at Walmart for $19.52 is close behind at","about 17 cents. One thing to check first: size 3 is made for 16 to 28","pounds; if diapers gap at the legs or leak, size 2 is the better fit."]
f=[]
f+=note(620,42.0,48.9); f+=note(390,48.9,51.0); f+=note(520,51.0,62.6); f+=note(472,71.2,78.7)
a,b=101.5+d,109.75+d
f+=[box(160,434,520,118,"white",a,b)]+[txt(l,165,440+i*24,15,"0x1d2233",a,b) for i,l in enumerate(WHICH)]
f+=[box(730,733,492,105,"0xf6ffed",a,b)]+[txt(l,739,739+i*20,15,"0x1d2233",a,b) for i,l in enumerate(PICK)]
a,b=109.75+d,114.0+d
f+=[box(160,58,520,100,"white",a,b)]+[txt(l,165,64+i*24,15,"0x1d2233",a,b) for i,l in enumerate(WHICH[1:])]
f+=[box(730,324,492,196,"0xf6ffed",a,b)]+[txt(l,739,330+i*20,15,"0x1d2233",a,b) for i,l in enumerate(PICK)]
f+=[box(172,731,490,56,"0xf6ffed",a,b), txt("for a local diaper bank; many give 50 free diapers a month.",178,737,16,"0x389e0d",a,b)]
chain=",".join(f)
blurs=[(200,505,1040,80,62.6,71.2),(155,778,710,60,134.0+d,145.5+d),(155,558,710,170,145.5+d,150.8+d)]
fc=f"[0:v]{chain},split={len(blurs)+1}[m0]"+"".join(f"[s{i}]" for i in range(len(blurs)))+";"
cur="m0"
for i,(x,y,w,h,a,b) in enumerate(blurs):
    fc+=f"[s{i}]crop={w}:{h}:{x}:{y},boxblur=12:2[b{i}];[{cur}][b{i}]overlay={x}:{y}:enable='between(t,{a},{b})'[m{i+1}];"; cur=f"m{i+1}"
subprocess.run([F,"-loglevel","error","-y","-i","cut_v6.mp4","-filter_complex",fc.rstrip(";"),"-map",f"[{cur}]","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","cut_v6_clean.mp4"],check=True)
print("clean ok, shift", round(d,2))
