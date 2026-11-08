STATUS: live

# Headset session, 8 Nov 2026 (Meta Quest 3, casting)

Observed by Claude (Haiku 5.5) through Meta's browser casting view. Observation only: no edits to src/, data/ or public/, no walk, no dev server, no commits. Frames are whole-screen captures, so they also show the Claude app and other windows on the Mac.

Frame folder: `out/cast-2026-11-08/frames/` (834 frames, 11:48:28 to 12:46). Marked moments: `out/cast-2026-11-08/marked/` (33 files). Working log: `out/cast-2026-11-08/notes.txt` (69 lines). The `out/` folder is git-ignored (`.gitignore:7`).

---

## 1. Setup

- **Input:** a controller (Sérgio: "if I'm with a controller"). He also mentioned hand tracking, which he said was confusing; no hand session was run.
- **Start:** the first frame that showed the cast picture was 11:53 (LambyOS Setup). He said "starting now" at about 11:54. The first frame saved at 11:48 showed the desktop, as expected before casting.
- **End:** he said "we can stop here" at about 12:46. The capture loop was stopped after frame 124629.
- **Frames:** 834 saved, 4-second interval, whole screen.
- **Cast gaps:** none recorded after casting started. Before that, casting redirected to a Meta sign-in page (`auth.meta.com`); Sérgio signed in himself, and Claude did not type credentials.
- **Cast view:** `horizon.meta.com/casting/`, in the Claude Browser pane. The cast page said "Select Web", not "Computer" as Claude had first said.

---

## 2. Checklist a–n

Key: WORKS / PROBLEM / NOT SEEN. Frame names are in `out/cast-2026-11-08/frames/` unless marked as "marked/".

**2003**

- **a. Diary collapse jingle:** NOT SEEN. Sérgio did not type "jingle" and the 2003 diary collapse did not come up in the frames. He did say the boot sound does not start after the LambyOS screen appears (see §3).

**2016 (Vera)**

- **b. Two windows side by side (platform left, phone mirror right):** NOT SEEN. The frames at 12:42–12:44 (`124243`, `124342`, `124445`) show the platform on the monitor and a phone on the desk showing 9:41. No mirror window was visible. Sérgio: "where is the point of the phone?"
- **c. Orla's message once; Wick stamp card lifts and turns:** NOT SEEN.
- **d. Lambient speaks; guide takes him to the next thing:** PROBLEM. The Lambient permission dialog appeared (`124342`) with very small body text and a yellow tag over the Allow button. The guide walking him to the next thing was not seen.
- **e. Evening messages readable:** NOT SEEN.
- **f. "Phone disconnected" and the phone goes dark:** NOT SEEN.

**2026 (Maya)**

- **g. Both screens readable from the seat:** PROBLEM. The monitor text is small and serrated (see m). The phone was on the desk and showed Dec 6 at 12:44 (`124445`). The messenger on the laptop ("Kettle") was not seen. Sérgio stopped before reaching 2026.
- **h. Buttons at the bottom; tab names not cut off:** NOT SEEN.
- **i. Her room (things disappear, portrait, news strips, ticket; the turn):** NOT SEEN.
- **j. Contagion map on the ceiling; propaganda clip:** NOT SEEN.
- **k. "Try it on" (mirror, about 30 s, link breaks in):** NOT SEEN.
- **l. The stream (fundraiser bar, viewers, "SESSION TERMINATED"):** NOT SEEN.

**Everywhere**

- **m. Text sharpness:** PROBLEM, worst on the monitor and in the 2003 windows. Serrated, stepped edges on thin lines, readable only close up. Frames: `115604` (Profile setup), `120027` (Seekr results), `123007` (Harbor board, marked "1997_folder_readability" and "text_edges"). Sérgio: "if I'm very close to it, it's better. If I'm not, then it's not."
- **n. Anything broken:** PROBLEM. See §3 for the list. Frame drops or fps could not be checked (see §4). Possible lost press: Sérgio saw phantom button presses on the wall in front of the root cause; not visible in the frames (`120201`).

---

## 3. New problems, most severe first

Each item lists what, where, when, frame, and Sérgio's remark (his words are in §5).

1. **Era transitions use fades to black.** Era change (12:16, `121607`; 12:42). Sérgio: fades to black and fades to the same colour are not wanted anywhere, before or after. Needs a morph into the room, as on desktop. Miniatures on the desk look ugly (12:16).
2. **Video breaks up when the hand moves.** Lamby video (12:19, `121957`). The picture breaks ("serrated"), not from frame rate.
3. **Lamby boot sound missing.** After the LambyOS screen appears (11:54). No sound at boot.
4. **Lines and text are serrated and hard to read on all 2003 and 2016 windows.** Profile setup (`115604`, "My family is religiou" is clipped), Seekr results (`120027`), Harbor (`123007`), Lambient dialog (`124342`).
5. **Text clipped or overflowing its box.** "My family is religious" cut off (11:56). "Go to the next task" label runs past its button (12:28, `122805`). "Restorify is closing" cut off by a bar (12:40). Caleb's "say nothing yet" button cut off at the parentheses (12:33). "Not yet available" text sits over the Allow and Not you buttons (12:43).
6. **Hover/pointer bar and selection.** In VR, pointing shows a bar and the controller becomes the button; the box crosses his line of interaction (12:09, `120943`). Tapper (Game Boy) sits to the side, hard to point at, and disappears when he moves a little to the side (12:11, `121136`).
7. **Caleb message arrives too early.** After the New You video, Caleb's message comes before the PureMail email. Order should be: contacting-system box, glitch (404-style), PureMail, then Caleb inside the Messenger (12:38, `123858`).
8. **PureMail plays in Lamby's voice.** Unnecessary (12:38).
9. **Update does not pop in.** After "it wasn't me that was broken", the service transition takes too long to appear (12:41, `124139`). "Remind me later" leads nowhere.
10. **"Your record" taskbar item still shows** (12:44, `124445`). He does not want it.
11. **Screen too close to his face and too far from the desk edge.** Fixed distance should be to the headset, not the room (12:44). Desk edge: the screen hangs over it (12:43).
12. **Font on the Lambient dialog very difficult to read** (12:43).
13. **Daily realignment window hides desktop icons;** they reappear on close, with cut-off names (12:21). The taskbar item "found" is not clear (12:22, `122219`).
14. **Mentor chat closes; empty desktop follows with no next step** (12:05, `120549`).
15. **Release Work window** (12:08, `120811`): figure in the preview looks flipped; text sits on a bare grey area; animations and styling not fixed.
16. **Family Form looks bare** (12:12, `121205`), stacked buttons overlap (12:13, `121316`), and the end button says "return" where it should say "continue" (12:14, `121439`).
17. **Diary entry flagged, then "Removal stalled"** (12:14, `121439`). Sérgio: the entry should not continue by itself.
18. **Music missing** for the Restorify section and for the Fellowship network (11:58, 12:21). The end walk has a track; Restorify does not.
19. **Restorify "Terms of Continued Care" window:** "Agree" appears greyed on page 1 (12:15, `121538`). The restore symbol should look more 2003.
20. **Big break at the summer weekend** (12:04, `120408`): after the image, a gap while he is still typing. Sérgio thinks it is the look-behind requirement.
21. **Root Cause Digger** needs design, aesthetics, sound, and clearer intentions. Lamby should suggest it before the Family Form (12:07).
22. **Caleb's messenger window** is small, tight, and mIRC-like (12:33, `123319`). Should be bigger, wider, MSN-like bubbles with scroll. Media player shows an error over it while loading (12:34, `123400`).
23. **Conducted beat (NetVision Player)** works, but needs a wait button and a two-step timing (12:35, `123524`).
24. **1997 folder and Harbor board** are hard to read (12:30, `123007`).
25. **Visual culture** of each era and OS needs to be stronger (12:13).

Possible build-version issue: he thinks this is an old build. The zip may have failed without the 2016 and 2026 changes (12:45, `124530`). Not checked.

---

## 4. Debug plate per era

The plate was not read from any frame during the session. Sérgio did not report fps or draws. The checks were not done, so there are no figures per era.

- **1997:** not read.
- **2003:** not read.
- **2016:** not read.
- **2026:** not reached.

---

## 5. His remarks, word for word, with time

Times are the clock time of the message, from the frames and notes. Spelling and punctuation are as typed.

- **11:54** "I can start by saying that there's still issues with the sound where the boot up sound doesn't start after you already see the Lambi OS appearing. So there's some error there. And also, I do wonder if that computer had a black plate there, but it's okay. And what is this red box on top of the table?"
- **11:56** "still need to find a way to improve the reading experience, because it's still with the serrated edges on the lines. I feel like it's a little bit better, but it's still at a, if I'm very close to it, it's better. If I'm not, then it's not. Also here says my family is religious, is like cut off."
- **11:57** "if I'm with a controller, there's a message, showing the look at your wrist. But that's for the hand tracking. So that's confusing."
- **11:58** "I feel like we need some sort of MIDI song for the fellowship network here, because we had the song of the unwalk, and then when we opened this, it became very bare. So I think we kind of need it to have some sort of song to it. Oh, Lambie just opened by itself. Okay, great."
- **11:59** "here, seeker, it needs a little bit, like this press here to play fit in, like this doesn't need to be here. It was just on the previous page here on the fellowship network, but it doesn't need to be on everything, because then it becomes quite confusing. Because we need a little bit more space to make this more legible, because they need a little bit more of distance between them. Could you do that? And also add that to the report then, because it doesn't need to be here."
- **12:00** "we need the space, because then there's errors like see also in dossier retrieval by contact, chat with others. Like, this is all very convoluted and we need more space, and also like a little bit more differences in styling of the pages."
- **12:01** "to minimize the netpilot. The root cause is not on the desktop, by the way."
- **12:02** "Did we come up with a sound thing for this? For Mirk? Also, there's still like phantom bunted presses on the wallow in front of it for the root cause, because now the root cause appeared downstairs. And I'm assuming, yeah, this needs to be fixed."
- **12:04** "there's a break here that was us at the summer weekend. Everyone was where you are, like, because before the image appeared right on top of while I'm still typing, I just thought of you, and then there's a break here. I think it's because you're supposed to look behind yourself, like has the glow in the desktop version. So either we do the same effect here, or we need to compensate to, we need to remove that even from the desktop version, because it doesn't make sense to have this huge break here."
- **12:05** "Okay, the chat with the mentor Rob, it closed itself, but then all disappeared. So are we expecting people to know what to do next? Because that's a little bit confusing. So let's look into that if it makes sense to for the initial box here at the side that said your next steps. Maybe that one should pop in back again, or Lumbee should say something in regards to that about you can try other stuff, or if you want, reach out to me to open the or if you want to continue family form, I don't know, something around those words."
- **12:07** "I do feel like people should play the root cause digger. It is a really cool game that we can improve on it, and I think we should, just to make it better in terms of design, make it better in terms of aesthetics, because it needs sound. You need to make a sound for it, and it needs to be more clear of the intentions to it. It's a very interesting way of playing through the topic. So let's improve on this, please, and let's try and make the suggestion from Lambie to be, before you jump into the family form, do you want to play the root cause digger and understand where your SSA comes from? Because we need to connect to the topic, and we need to connect to the educational aspects of the topic."
- **12:08** "Also, we still didn't fix yet the animations and the styling of the release work. This needs to be fixed, please. Yes, it's still not done and it's still breaking. Yes, it's still flipped and yeah, it needs to be fixed."
- **12:08** "the end, it says the room gets quieter. Is that because it's supposed to have sound before, or just the emotional connection you're supposed to have with it? Because I'm not saying bad about it. It works just wondering."
- **12:09** "also in VR, and when you point into something, appears the bar, right? Your hand pick it up. This needs to be more clear it needs to highlight the stuff so I can better understand what I'm picking and touching on, because the box crosses over my line of interaction, so it feels like I'm touching a button your hand, your handheld pick it up, becomes a button. Is that the idea?"
- **12:11** "Okay, when we start the tapper, you see, it's very hard to point, like it's to the side and it should be in front, and it should be much easier to understand where am I pressing, because there's like a very small range of interaction, so it's very difficult to press the buttons and know where you're tapping on the buttons. So please, we need to fix this, because if I keep touching, then if I move a little bit too much to the side, then it just disappears, the Game Boy, and becomes very hard to see. And also, how can we, with the controller, move things around? We need also need to do that. So maybe it needs like a corner, like we need a safer boundary around it, so people, if they like touches a little bit to the side, it doesn't run away. And also it needs to have some sort of grabbing hand that I can just grab around and pull it to where I want to."
- **12:12** "Also, I pressed the family form, and this design is a little bit bare. If we can look into making this a little bit better, I would appreciate it."
- **12:13** "Like for this, like this is the way the design of this, like it makes no sense when you have like all of this blank space. It needs either images, design stuff, like even the on hold, it's still on top of each other. Like this could perfectly be a box in front of it. Like there's some care for design need to be done here. And like the serrated edges, lines is still very bad here. Because then we have some sort of design. And this needs to also be improved because it's very similar to the session part of it. And we could explore more of the visual aspects of the culture of the time, of each era, of each operating system, and we should"
- **12:13** "The article that I'm going to write about this is also about visual culture. So we need to embrace more of the visual culture of the time, of each era, of each operating system."
- **12:14** "the button at the end of the family form, it says return, and probably should be continue, because then the placement appears. So this needs to be like the continuation, right? Because we're going to the end of the first era. Yes, I like this sign. Press to right. The entry continues by itself here. You need to remove this. Like it's not, doesn't need to be there."
- **12:15** "Okay, I'm going to check with you if, how is this? Okay. If I press cancel, what does it do? Nothing. Oh, it repeats. It goes back to the same system notice. Great. That's what we need. Update now. We checked everything. Restore flight 2003. So the terms and conditions of continued care. This is really great. But like the symbol here, restore flight is really good, but it needs to be a little bit closer to 2003 design, so it can create some differentiation from the passage of time."
- **12:16** "Okay. Since we're here, I'm going to check also the transition. Oh, no. Horrible. The fading was horrible. No. I don't want any of this. And this is not working. This is very ugly. The miniatures, very ugly. We should no. This is not good."
- **12:18** "like the transition between ages, the eras. First of all, it needs a little bit more of sound because it's missing that part. It needs to be longer. It was very fast, the fading. The fading is not great because it goes fades to black, and I don't want fade to blacks in any of it, any of the all the other fades before it and everything fading after this. I don't want fades to black, fades to the same tone, color, something, but not fade to black. And the whole point of having the miniature in front of you was for you to experience the room changing. So we don't need a fade here. What we need is to see the same experience that happens in the desktop, which is the morphing. So you see stuff morphing and changing and transforming themselves. And this is what you need to see here as well in the VR experience. And then you have the miniature in front of you as a symbolic way, but like the walls around it, you need to make it like what happens with Sims, where two of the walls, the back walls, you can see that. And then you just, as you turn them around, you can see the room around, but this needs to be some sort of action to it. So stuff slowly are morphing, while you can see the time passing of the dollhouse, but also needs like some sort of continuation. So if the person wants to, when the person's like holding it to rotate, like it needs a button that you can rotate, and then it continues after a little bit. Like it's a, we have like a section of time where people can interact with, and then it can finishes the update. But we need to see that, right? We need to take in consideration that it's not just like a 2 second and it's done. It needs to be an experience, an emotional experience, and also to help the viewer understand that it's flowing through time."
- **12:19** "Yeah, we need to really look into finding solutions for these serrated movements, because when the Lambi video is playing, if you move your hand, like the image just kind of breaks itself. Like if the, not if the refresh rate, but something is like breaking it a little bit there."
- **12:21** "We did have a song, a music sound for the end walk. Should we also have one for the Restorify? I think we should. It makes sense to have it. And be wary that if I am looking at the daily realignment, then there's missing some programs on the desktop. But then if I close it down, they appear, like, for example, the referral and the release. But this is very difficult to understand what they are, the release work and stuff. Yeah, just because you cannot see the full name of the file. And the referral, yes, this is where we are. OK, we shall continue."
- **12:22** "I'm gonna look into, I've done the check-in. So when it opens back again, the referral, so, but the referral needs a different name because it doesn't make a lot of sense. Oh, but now it changes to the referral notes. But beforehand was going to the Restorify, I guess. So we need to look at what is there happening. And what is the found? Oh, but in the bar, it's called found. So we need to look at what this is."
- **12:24** "it's a little bit confusing now because you have the list of things to do, and then it jumps to the video already done. And also, weren't we supposed to see the video of Caleb talking already? Made like the slides of it. So I feel like something is missing here in the middle. Or did we just remove all of that? Because I felt like we don't need to do the editing of it. But I feel like it's missing something. And also this images of Daniel they need some sort of sound to it. And a little bit more of a design there. For parents, it takes 5 minutes. Everything is confidential. Like, this is cut off. Everything is confidential. So I pressed the 'Are you struggling to start here?' And I'm not fully sure."
- **12:24** "So for your parents, it takes only 5 minutes. What is this now? Your son's first name, his age, when you didn't first notice the change in him. What did you hear about the news story? What is this? Is this like the text that accompanies the this is not very well explained, please do explain. Because there's no continuation of what you're supposed to do."
- **12:26** "Are we using this moment to know about the creation of the films or about the publication of it? Because where is the connection to the arbor? I feel like this should be a point of connection, for example, to jump into the website where you can see Caleb's testimony, you can see Daniel's story as part of a collection of DVDs for the New You program or the Discover the New You. Oh, then appeared now, Lambie, the story is ready, press watch to see it. Okay, it's still an error there. But of course, this needs to, of course, this is already a website, but I feel like in a way, this maybe we can connect this to the arbor. And so it opens the browser. So the sequence before, we need a little bit more of understanding of your video and the fact that we need to upload the video and send it. And then after this, we need to jump into the website of the fellowship of the platform where Daniel is part of. And there we can see Caleb's other people testimonies coming soon, but we can see Caleb's story video and we can see ours there and have this to be part of it so we can better understand the language of internet media, how they share the clips of the testimonies and all of that. So we need to better rethink this connection here."
- **12:27** "the next task has two areas of interaction. This today in Restorify appears very late now."
- **12:28** "we're missing an indication that we can explore other stuff around us, right? The next task just doesn't really help there. And also the text, go to the next task, is still outside of the boxes. And so if the restore new, what to do at Restoreify appears, it should also tell us that we can explore the desktop."
- **12:30** "Okay, I'm looking at this folder of the 1997. I heard the beeping of Messenger. That's great. But this is very hard to read. 2 years now they kept the tape. This is really difficult to read. It needs to be worked over, or it's just because of the serrated lines. It's just really, really, really hard to read. And also, if I close it, it should open back to the menu. And this one, yes, it's better. $19.99, new morning, yes. This is all very good material. It's still, it's just difficult to see. Because now the messenger appeared, but the hardware, we still haven't done the hardware. So it makes sense, the transitioning to here, as not only the DVD selling of the testimonies, but then we can add the fact that we should publish it in the message board of the hardware, right? So it's a second, it's another action that we need to do. And that makes more sense to me, because then we can post the reply. Instead of posting the reply, it's posting your testimony."
- **12:31** "So yeah, it goes back to the point of connecting with the digital element and the digital culture. So we have the submission, you submitting your video. So maybe we can add to the point of the folder of 1997. So there's like the video there. So we open the video to upload it to the platform. And then the platform takes us to the website where you can see where the DVDs and the other testimonies are, and we can watch Caleb's. And then we can need to push to publish, to like promote the video inside of the Arbor, like the message board. So we're just sharing that information as part of our demands of the system, right? So the visualization and all of that, and then we post it here."
- **12:33** "So since we got the message from Caleb, when we open it, Daniel, it's Caleb, should already be there. The say nothing yet button is still cut off the parentheses. This needs to be faster. So every time it beeps, it shows the message. We don't need to see it, the words appearing one by one. It's too slow. And it needs a little bit more spacing so we can better understand. This is too close to the Mirk, and it should be closer to MSN. So like the bubbles, you should be more able to see them, and we can, we have a remote, so we can scroll up and down. So the text can be a little bit better in terms of distancing, so we can better understand what it is. And also this window could be bigger. It doesn't need to be this small into the corner, right?"
- **12:34** "MSN could be a wider image. The media player loading, there's an error that goes on top of it. Oh, okay. It took a little bit too long to start playing the song, which is okay. And we should add on the media player a button to loop it if we want to."
- **12:35** "Okay. I want to be with you. Daniel, I have stopped you here. There. Yes. Waiting, it is conducting, that's what the flag says. Oh, that's why it's all the boxes on this side, because then we have this. Okay, it makes sense. So it's, we have space for no one special. Those days were for your wife, you'll have when you're. Yes, this either needs a button so we can interact, so people can take their time to read it. But if a lot of time passes, then it continues, right? So it's a two-step there. Don't be discouraged, Daniel. I found something that helped with others like you. Great. Just watch. Yes. Down in the EU program."
- **12:38** "This is such a great thing. Oh. Okay, now after the video, something is weird here. Calling mentor on the line. Like, this message from Caleb should not appear here now, because we are still waiting for the accountability network. Okay, there's a lot of confusion here of what is happening, because the message from Caleb should be after the pure mail appears. So it should just be the box of trying to contact the system. The system is flagging you and is going to submit you for the program, right? But while that happens, there's a glitch, and the glitch before here is not great. And then it appears the pure mail inbox. So we got an email from the team, but the Caleb message is not here yet. It's after the email. So because we can read the email, it doesn't let me to cut it. We can read the email and play it. Now playing the message in Lampius voices. We don't need this. It's unnecessary."
- **12:40** "But we need, first of all, this also needs a revamp of the design because the Restorify's closing is cut by a bar here. So, but the idea would be you have the new you video, the message like the as it appeared before, the box saying that it's contacting the system, like trying to connect to the servers of the system, but there's an error, there's a glitch, like saying like there's an error, like a 404 or something error code message, and then the through that glitch, like then appears the pure mail, and you read that the Restorify team had to close down, and then through that, the messages of the hope restored messenger start to come back, and through then the new message from Caleb appears, right? So we don't need the notification to say that there's a new message from Caleb now, as the hope restored messenger comes back to life, it appears and continues the conversations with Daniel."
- **12:41** "So when it appears, then it wasn't me that was broken. It takes a really long time for the service transition to appear because there's no actual update happening here, and it should be an update. So then it wasn't me. It should then pop into the update."
- **12:42** "remind me later, it doesn't work because there's no place to come back to. So when you open like this green panel with then it wasn't me, continue, then it just goes, the flow is to go for the update to the Grace platform, which is a little bit better in terms of design. Okay, now we don't have a fade to, which is good, but at the same time, like the dollhouse doesn't fully work. Oh no, now we have the fade. The fades are terrible. This needs to be a morph into the space. So instead of the flyover, it needs to morph into the space. Okay, but now we're in 2016."
- **12:43** "Okay, the not yet available, it's confusing because it's on top of the allow and the not you. And we need to change the font of this. This is very difficult. And the screen is a little bit further away. If possible, if you could put it just a little bit closer to us, because it's falling a little bit out of the edge of the table, as you can see there."
- **12:44** "the Your Record button is still appearing here, which I don't want to. And also, where is the point of the phone? Oh no, this is too close to my face. Like this is not fixed. If I'm closer to the screen, like this should be a not a fixed distance to the headset, not to the space. I feel like this is not updated. Yes, I don't think this is the update. No, this is something wrong. I'm just gonna jump into Maya to see if it's missing something."
- **12:45** "Yeah, this is an old version. Oh, this is so difficult to read. Yeah, because the desk is still too further away. And yeah, this is an old version of I think the compiling of the zip, it failed because it's not doesn't have the changes in 2016 and 36."
- **12:46** "So we can stop here. I want you to make the report, and I also want you to include all of the text that I wrote, so the session can understand everything that we talked."

Remarks logged during the session but not typed word for word by Sérgio (paraphrased in the working log): "the boot sound" (11:54); "the Mirk" (12:02); "Lumbee" (12:05, probably Lamby); "Press to right" (12:14, likely a sign); "2003 Restorify header" (12:15).

---

## 6. Open questions for Sérgio

These are the things the frames could not show, or where the notes are unclear.

1. **"Mirk" (12:02).** Is this a name, a word, or a typo? "Did we come up with a sound thing for this? For Mirk?" Sound for what?
2. **"The room gets quieter" (12:08).** Is it meant to have sound before, or is the quiet an emotional beat? Not found in docs/data/src; ask the writer of that beat.
3. **"EU program" (12:35).** "Down in the EU program" may be a typo or an in-world name. Check.
4. **"Lumbee" (12:05)** is probably Lamby. Confirm.
5. **Phone (12:44).** What is the phone for in 2016? Nothing was seen on it except the clock.
6. **The "found" taskbar item (12:22).** What should it be?
7. **Caleb's video and slides (12:24).** Was the video of Caleb talking meant to appear before the list of things to do? Or was it removed on purpose?
8. **The New Morning form (12:24).** What should happen after the form's questions? In the build there is no Next or Submit step. The docs do not say.
9. **Caleb's video vs. the Arbor (12:26, 12:31).** Where should the upload step sit, and what happens to the uploaded video?
10. **Phantom presses (12:02).** On the wall in front of the root cause. Need a frame with the cursor on the wall.
11. **Old build (12:45).** Was the headset running a stale build? Check the zip with the 2016 and 2026 changes before the next session.
12. **Debug plate.** Was it visible during the session? No fps or draw counts were read.
13. **The 2026 part.** Not reached. The report stops at 2016 (Vera) and the Family Form, Restorify and the Harbor board of 2003.
14. **Camera distance.** The screen distance should be fixed to the headset, not to the room. Confirm whether this is a headset issue or a build issue.

---

## Files

- Report: `docs/reinterp/HEADSET_SESSION_2026-11-08.md` (this file)
- Frames: `out/cast-2026-11-08/frames/` (834)
- Marked moments: `out/cast-2026-11-08/marked/` (33)
- Working log: `out/cast-2026-11-08/notes.txt`

## Addendum (added after the session, at Sérgio's request)

- **Hidden skip button (controller):** if the controller's back button is pressed about 10 times in the HIO build, a skip button appears so the team can jump ahead. Sérgio asked for this to be recorded so the team can use it to work through the piece faster. Not observed in the frames; reported from his account.
