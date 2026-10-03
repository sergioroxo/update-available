STATUS: live

# YOUR UPDATE HAS FAILED (PC Simulator) - exhibition text, v6
*For After Virtual Reality, CDN, University of Bergen, 14-22 October 2026*

## Notes before the drafts

**On "Sonnet 4.6 to different iterations":** I searched BUILD_LOG.md and every dated doc in the repo. Every explicit model tag I can find reads **Sonnet 5** -- there is no Sonnet 4.x anywhere in the written record. What I *can* verify, and what I used instead: **Opus itself was upgraded mid-build, from 4.8 to 5, in the space of two days (22-24 July 2026)** -- Session 44 on the 24th is tagged "Opus 5" where Session 43, two days earlier, was still "Opus 4.8". If you know the early (pre-branch) work ran on an older Sonnet, I'll take your word for it and add it, but I can't confirm it from the files, so I left it out rather than guess.

**On Fable / Opus:** the record runs the other direction from how you remembered it. `docs/reinterp/03_COORDINATION.md` shows coordination was formalized on **2 July 2026** with Fable 5 already installed as coordinator. What changed later (a restructuring the doc calls "Round 15") is that **Opus was originally also doing some design/spec authoring**, and that restructuring pulled all of that onto Fable alone, confining Opus strictly to "hard code" (architecture, spatial systems, complex builds from Fable's specs). So: not Fable-then-Opus-as-coordinator, but Opus-partly-coordinating-then-narrowed-to-build-only. I used the verified version below.

I also found a good concrete example of the same "it changed over the build" point you're making: the earlier v4/v5 drafts said "24 sources", and an intermediate build state (S87, 15 August) really did have exactly **10 sourced entries** reachable in the Credits view. That number was never wrong, it was true *then*; the dossier grew to 24 by the time the constellation shipped. Worth having in your back pocket if anyone asks why the numbers moved between drafts.

---

## Long version (word count: 852)

**Context**

SurvivingSOGICE is a PhD creative-research project at the University of Bergen's Center for Digital Narrative, building a public archive of how conversion practices, efforts to change a person's sexual orientation or gender identity (SOGICE), have operated across Europe, alongside a set of interactive works that give that research a body. YOUR UPDATE HAS FAILED (PC Simulator) is one of them: a browser and WebXR narrative, playable with a headset, on a desktop by dragging to look, or on a phone by turning it like a 360 video.

The piece began as a bare scaffold on 12 June 2026, an Era-1 boot sequence on a pixel monitor, and has been rebuilt almost daily since: past 460 commits and 1.2 million lines of change in three months, logged session by session in the project's own build record. It sits inside SurvivingSOGICE's wider archive work, which has been running since April 2026, but it is not a database interface. It is a standalone fiction, built to carry what the archive documents rather than to display it.

**The piece**

One desk sits inside three rooms that keep being rebuilt around it. Across thirty years and four eras, three people take the same seat. In 1997, Daniel is sixteen; a message board and a printed questionnaire ask whether he has corrected the way he walks, talks and sits. In 2003, the same Daniel is older, and the promise has become software: a daily check-in, a record of who writes to him, a file that will outlive the group that opened it. In 2016, Vera earns her wage correcting other people's testimony for a platform, one rule at a time, until a law arrives in her phone's group chat and makes what she does a crime; nobody in the room says anything. In 2026, Maya's session restores itself before she has touched a thing. A companion finishes her searches. Her photographs come back "improved." Her old name survives every migration, kept "for continuity of care."

Nothing plays from outside the chair. You read the screen, then you turn: the room's other face is the filing side, where attention becomes evidence. You never walk; the only thing the piece asks of your body, in any of its four eras, is the turn. The interaction stays deliberately small: insert the disk, play the tape, connect to the channel, accept the placement, write to a future self, press through the update, decide what you can carry. Eight such acts, repeated and varied, are enough to have the piece whole.

Every device arrives by the same rite: a notice, terms, an install, a restart, and eventually a failure that is answered with a new name, not an ending. Then, in the last room, an invitation reaches Maya's headset that the apparatus did not send. What is on the other side has no category the system can file it under, and its labels start to fail.

The fiction is built from documented history, never from the people who lived it. Its closing constellation carries twenty-four labels: seven for the project's own research and ethics process, seventeen tracing the documented history behind each era, each rated by the piece's own evidentiary law: documentary, documentary, contested, and, for the room that has not happened yet, speculative.

**How it was made**

Sergio Roxo directs the project and does not write code. Coordination was formalized on 2 July 2026, when Fable 5 became project coordinator and creative director: it maintains the plan, writes every build prompt, and reconciles every result, while Sergio runs each session himself, in its own chat window, and keeps every ethics, voice, and greenlight call. The division of labor was itself revised once the project was underway: in an earlier phase, some design and specification work went out to Opus; a later restructuring pulled all design authorship onto Fable alone and confined Opus strictly to architecture, spatial systems, and complex builds from Fable's own specs. Opus changed underneath the project in the same week it was narrowed, upgrading from version 4.8 to version 5 between 22 and 24 July. Sonnet 5 has carried the volume of well-specified content and data sessions, and verification chores, throughout. Codex 5.5 runs standalone prototypes in parallel; ChatGPT's Deep Research mode is consulted as historian and sourcer, narrowed at the same restructuring to creative and documentary research only, never process or logistics. Voice lines for the apparatus, never for the people it acts on, are synthesized offline with a local model, Supertonic, and committed as ordinary audio files; nothing is generated live, and the shipped piece makes no network calls and stores nothing a visitor types. Room and sprite art was drawn and exported from Aseprite.

Every line of display text, including the felt, survivor-adjacent material, is written by Claude under Sergio's direction. His words: "I am not going to write it, is your work here." He keeps the final edit on every ethics call, every line of dossier phrasing, and any line he has written himself directly.

Content note: conversion practices, family and community coercion, and a system that will not get a person's name right.

---

## Short version (word count: 286)

YOUR UPDATE HAS FAILED (PC Simulator) is a browser and WebXR narrative about SOGICE, sexual orientation and gender identity change efforts: the practices that treat a queer or trans life as an error waiting to be corrected.

One desk sits inside three rooms that keep being rebuilt around it. Across thirty years and four eras, three people take the same seat. In 1997, Daniel is sixteen, corrected by a message board and a printed questionnaire. In 2003, the same Daniel is older, and the promise has become software: a daily check-in, a record of who writes to him, a file that will outlive the group that opened it. In 2016, Vera earns her wage correcting other people's testimony for a platform, one rule at a time, until a law on her phone's group chat makes what she does a crime. In 2026, Maya's session restores itself before she has touched a thing; her old name survives every migration, kept "for continuity of care."

You never walk. You read the screen, then you turn, toward the room's other face, where attention becomes evidence. Every device arrives by the same rite: a notice, terms, an install, a restart, and a failure answered with a new name, not an ending. Then an invitation reaches Maya's headset that the apparatus did not send, and something arrives the system has no category for.

The fiction is built from documented history, never from the people who lived it: twenty-four sources across four eras, each rated documentary, contested, or speculative.

Written and built with Claude (Anthropic), under the project's direction, research and ethics rulings.

Content note: conversion practices, family and community coercion, and a system that will not get a person's name right.

---

## Programme blurb (word count: 73)

A browser and WebXR narrative about SOGICE, sexual orientation and gender identity change efforts, and the devices that have carried it online for thirty years. Three people take the same seat across four eras as a questionnaire becomes software, software becomes a platform, and a platform becomes an ambient companion. You never walk, only turn. Directed by Sergio Roxo and built with Claude, from a dossier of twenty-four documented, contested and speculative sources.

---

## One line

One desk, thirty years, many hands passing the same file, until it reaches someone they cannot file.

*(Changed 2026-10-03, his B26 ruling: the systems are "a multitude of actions and systems, they are never one". Was: "…four names for the same demand, until the system meets someone it cannot file.")*

---

## Appendix: your symposium abstract, typo pass only

I only touched spelling, punctuation, and two sentences that didn't parse (a literal "a room, , a room" duplication, and a stray period splitting a subordinate clause in two). I did not touch your argument, structure, terminology, or claims, including "immersivity", which I left as your word choice rather than "correcting" it to "immersion". Track your original above it if you want to compare line by line; I didn't reflow the whole thing so it's easy to diff.

> YOUR UPDATE HAS FAILED: AI-Assisted Co-Creation, Dual Use, and the Subversion of SOGICE
>
> Generative artificial intelligence (AI) can reproduce and perpetuate anti-LGBTQ+ bias while enabling new and innovative experiments in interactive and immersive narrative. This practice-based paper examines this tension through the ongoing development of YOUR UPDATE HAS FAILED, a web-based browser and VR narrative that places participants across four historical periods. Developed as part of my PhD project at the University of Bergen's Center for Digital Narrative, the work addresses Sexual Orientation and Gender Identity Change Efforts (SOGICE), commonly called conversion practices or therapy. Based on the false premise that LGBTQIA+ identities can and should be changed or suppressed, SOGICE encompasses therapeutic, religious, social, and aversion practices, as well as the digital infrastructures through which their coercive logics are reproduced.
>
> Spanning 1997, 2003, 2016, and 2026, the narrative traces the digital transmutation of SOGICE's movement, connecting participants to a computer, a room, and different users in each period, as the software updates from early online communities and religious outreach to platformed wellness, moderation, surveillance, datafication, and AI-mediated persuasion. Instead of explaining SOGICE externally, the work communicates through the apparatus's own materials, including fictional organizations and products. The project therefore presents SOGICE as a mutable apparatus whose language, media forms, and promises of care, correction, choice, and progress all change, while its demand for queer suppression remains.
>
> By investigating how immersivity can coexist across formats rather than being confined to the headset, participants engage by turning, clicking, and reading, rather than walking. Combined, its design, duration, repetition, interface dependence, and constrained choices offer a critique of SOGICE while allowing understanding of these practices. Both the browser and headset provide distinct modes of encountering the apparatus, thereby extending VR's potential into alternative forms of interaction that foster situated knowledge and critical understanding of coercive practices. Serving not only as a technology of presence and social education, YOUR UPDATE HAS FAILED also functions as an activist and epistemic stance within a system that frames coercion as care, correction, choice, and progress. Ultimately, incorporating the knowledge that LGBTQIA+ identities cannot be changed, the machine's inability to classify other people is what causes its breakdown.
>
> From a situated queer researcher-practitioner position, I examine how mainstream generative AI can be leveraged to co-create an interactive narrative that subverts the rhetoric, interfaces, and procedural logic of an anti-queer apparatus against itself. Developed in collaboration with Claude (Anthropic) and ChatGPT (OpenAI), the project incorporates AI-generated code, environments, sounds, and substantial portions of its writing, all under human authorship and project direction. This approach foregrounds accountability, source verification, ethical review, and documented constraints as central elements of the work's subject matter.
>
> Utilizing research-through-design, reflective practice, artifact analysis, and research on human-AI co-creativity, I document processes of testing, verifying, transforming, constraining, or rejecting generative outputs. Prompts, model outputs, production records, code revisions, and automated checks render these negotiations partially inspectable. I argue that socially responsible AI-assisted immersive narrative depends neither on technological novelty nor benevolent intention, but on making generative systems' fallibility visible and subjecting their contributions to situated knowledge, verification, ethical reflection, and refusal. YOUR UPDATE HAS FAILED uses multiformat immersion to create knowledge and understanding of SOGICE while challenging the interfaces and persuasive mechanisms through which anti-queer practices persist.
>
> This paper asserts that the value of AI-assisted immersive narratives resides not in the technology itself or in benevolent intentions alone, but in critical engagement with their dual-use capacities. Such redirection requires situated knowledge, source verification, documented constraints, ethical reflection on AI-assisted production, and accountable human editorial oversight. YOUR UPDATE HAS FAILED is therefore not merely an interactive narrative created "with AI"; it serves as an investigation into how fallible generative systems can contribute to socially engaged storytelling while ensuring that their content and direction remain subject to challenge and refusal.
