import json, subprocess, re
F="/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"
tl=json.load(open("timeline.json")); seg={i:(a,b) for i,a,b,*_ in tl}
dur={d["id"]:d["dur"] for d in json.load(open("tts/durations.json"))}
narr={n["id"]:n["text"] for n in json.load(open("narration.json"))}
# narration id -> desired start (timeline seconds)
want=[("01",seg[0][0]),("02",dur["01"]+0.3),("03",seg[2][0]),("04",seg[5][0]-3),("05",seg[7][0]),("06",seg[8][0]),("07",seg[12][0]+3),("08a",seg[14][0]),("08b",seg[15][0]+1),("09",seg[16][0]),("10",seg[17][0])]
starts=[]; prev_end=0
for i,(nid,t) in enumerate(want):
    s=max(t,prev_end+0.3); starts.append((nid,s)); prev_end=s+dur[nid]
# SRT: split each narration into sentence cues, proportional to characters
def ts(x):
    h=int(x//3600); m=int(x%3600//60); s=x%60
    return f"{h:02d}:{m:02d}:{s:06.3f}".replace(".",",")
def wrap(t,n=56):
    w=t.split(); lines=[]; cur=""
    for x in w:
        if len(cur)+len(x)+1>n and cur: lines.append(cur); cur=x
        else: cur=(cur+" "+x).strip()
    if cur: lines.append(cur)
    return "\n".join(lines[:2]) if len(lines)<=2 else "\n".join([" ".join(lines[:len(lines)//2])," ".join(lines[len(lines)//2:])])
cues=[]; k=1
for nid,s in starts:
    text=narr[nid]; sents=[x.strip() for x in re.split(r'(?<=[.!?])\s+',text) if x.strip()]
    # merge very short sentences
    merged=[]
    for x in sents:
        if merged and len(x)<28: merged[-1]+=" "+x
        else: merged.append(x)
    total=sum(len(x) for x in merged); t=s
    for x in merged:
        d=dur[nid]*len(x)/total
        cues.append(f"{k}\n{ts(t)} --> {ts(t+d-0.05)}\n{wrap(x)}\n"); k+=1; t+=d
open("subs.srt","w").write("\n".join(cues))
# audio: delay each clip, mix
inputs=["-i","cut_v6_clean.mp4"]; fl=[]; mix=""
for i,(nid,s) in enumerate(starts):
    inputs+=["-i",f"tts/{nid}.wav"]
    fl.append(f"[{i+1}:a]aresample=48000,adelay={int(s*1000)}|{int(s*1000)},volume=1.0[a{i}]"); mix+=f"[a{i}]"
fc=";".join(fl)+f";{mix}amix=inputs={len(starts)}:normalize=0,alimiter=limit=0.9[aout];[0:v]subtitles=subs.srt:force_style='FontName=Helvetica,FontSize=15,PrimaryColour=&H00FFFFFF,OutlineColour=&H66000000,BackColour=&H66000000,BorderStyle=4,Outline=0,Shadow=0,MarginV=22,Alignment=2'[vout]"
subprocess.run([F,"-loglevel","error","-y",*inputs,"-filter_complex",fc,"-map","[vout]","-map","[aout]","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","-c:a","aac","-b:a","160k","-shortest","body_v2.mp4"],check=True)
print("narration starts:",[(n,round(s,1)) for n,s in starts]); print("last narration ends", round(prev_end,1))
