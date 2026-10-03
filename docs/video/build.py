import subprocess, json, sys
F="/Users/aisandbox/Documents/companydata/node_modules/ffmpeg-static/ffmpeg"
# (start, end, speed) in source seconds
SEG=[(60.5,66,1.0),(66,76,0.8),(82,92,1.0),(102,112,1.0),(112,116,2.5),(116,122,1.0),(126,131,1.0),(180,190,1.0),(203,209,1.0),(343,347,1.0),(348,356,1.0),(362,370,1.6),
     (374,398,1.5),(398,418,1.6),(418,450,1.8),(450,486,1.8),(486,504,1.4),(504,514,1.0)]
parts=[]; concat=""; t=0; timeline=[]
for i,(a,b,sp) in enumerate(SEG):
    parts.append(f"[0:v]trim=start={a}:end={b},setpts=(PTS-STARTPTS)/{sp}[v{i}]")
    d=(b-a)/sp; timeline.append((i,round(t,2),round(t+d,2),a,b,sp)); t+=d
    concat+=f"[v{i}]"
fc=";".join(parts)+f";{concat}concat=n={len(SEG)}:v=1:a=0[cat];[cat]crop=1388:838:6:62,fps=30[out]"
json.dump(timeline,open("timeline.json","w"))
print("planned duration", round(t,1), "s")
subprocess.run([F,"-loglevel","error","-y","-i","take1.mov","-filter_complex",fc,"-map","[out]","-c:v","libx264","-preset","medium","-crf","20","-pix_fmt","yuv420p","cut_v5.mp4"],check=True)
print("done")
