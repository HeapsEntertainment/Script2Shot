  function isNarratorCue(rawCue, cleanName) {
    var upperCue = String(rawCue || '').toUpperCase();
    var upperName = String(cleanName || '').toUpperCase().trim();
    if (/^(THE\s+)?(NARRATOR|NARRATION|ANNOUNCER|VOICEOVER|VOICE OVER|V\.O\.|COMMENTATOR)(\s+\d+)?$/.test(upperName)) {
      return true;
    }
    if (/\(\s*(V\.O\.|VOICE[- ]?OVER|NARRATION)\s*\)/i.test(upperCue)) {
      return true;
    }
    return false;
  }

  function parseSectionLine(line) {
    var m = line.trim().match(/^(#{1,6})\s*(.+)$/);
    if (!m) return null;
    return { level: m[1].length, title: m[2].trim() };
  }

  function parseSynopsisLine(line) {
    var t = line.trim();
    if (/^=(?!=)\s*.+/.test(t)) {
      return t.replace(/^=\s*/, '').trim();
    }
    return null;
  }

  function parseSlugline(line) {
    var t = line.trim();
    if (!t || t.charAt(0) === '#' || t.charAt(0) === '=') return null;

    if (/^\.[A-Z0-9]/i.test(t)) {
      var forced = t.substring(1).trim().toUpperCase();
      return { explicitNum: null, intExt: 'SCENE', location: forced, timeOfDay: 'DAY', raw: forced };
    }

    var slugRegex = /^(?:(\d+[A-Z]?)\s+)?(INT\.\/EXT\.|EXT\.\/INT\.|I\/E\.?|INT\.|EXT\.|EST\.)\s+(.+?)(?:\s+(\d+[A-Z]?))?$/i;
    var match = t.match(slugRegex);
    if (!match) return null;

    var explicitNum = match[1] || match[4] || null;
    var intExt = match[2].toUpperCase();
    var rest = match[3].trim();
    var location = rest;
    var timeOfDay = 'DAY';

    var dashIdx = rest.lastIndexOf(' - ');
    if (dashIdx !== -1) {
      location = rest.substring(0, dashIdx).trim();
      timeOfDay = rest.substring(dashIdx + 3).trim().toUpperCase();
    } else {
      var singleDash = rest.lastIndexOf('-');
      if (singleDash > 2) {
        location = rest.substring(0, singleDash).trim();
        timeOfDay = rest.substring(singleDash + 1).trim().toUpperCase();
      }
    }

    return { explicitNum: explicitNum, intExt: intExt, location: location, timeOfDay: timeOfDay, raw: t };
  }

  function isTransitionLine(line) {
    var t = line.trim();
    if (t.charAt(0) === '>') {
      return true;
    }
    if (/^(FADE IN:|FADE OUT\.?|FADE TO BLACK\.?|CUT TO BLACK\.?|SMASH CUT TO:|MATCH CUT TO:|DISSOLVE TO:|CUT TO:|WIPE TO:|IRIS IN:|IRIS OUT:)$/i.test(t)) {
      return true;
    }
    if (/^[A-Z0-9\s]+TO:$/.test(t) && t.length < 35) return true;
    return false;
  }

  function parseCharacterLine(line) {
    var t = line.trim();
    if (!t || t.length > 42) return null;
    if (t.charAt(0) === '#' || t.charAt(0) === '=' || t.charAt(0) === '>' || t.indexOf('[[') === 0) return null;
    if (parseSlugline(t) || isTransitionLine(t)) return null;
    if (/^\(.*\)$/.test(t) || /^\d+$/.test(t)) return null;

    var cleaned = t.replace(/\s*\((V\.O\.|O\.S\.|O\.C\.|CONT'D|CONT’D|FILTERED|INTO PHONE)\)\s*/gi, '').trim();
    if (!cleaned) return null;
    if (/^[A-Z][A-Z0-9\s.'-]{0,35}$/.test(cleaned) && !/[.!?]$/.test(cleaned)) {
      return cleaned;
    }
    return null;
  }

  function analyzeCameraCues(sentence) {
    var size = null;
    var angle = null;
    var movement = null;
    var hasExplicit = false;

    for (var i = 0; i < CAMERA_RULES.length; i++) {
      var rule = CAMERA_RULES[i];
      if (rule.regex.test(sentence)) {
        hasExplicit = true;
        if (rule.size && !size) size = rule.size;
        if (rule.angle && !angle) angle = rule.angle;
        if (rule.movement && !movement) movement = rule.movement;
      }
    }
    return { hasExplicit: hasExplicit, size: size, angle: angle, movement: movement };
  }

  function findMentionedCharacters(sentence, knownCharsSet) {
    var found = [];
    knownCharsSet.forEach(function (charName) {
      var rx = new RegExp('\\b' + escapeRegExp(charName) + '\\b', 'i');
      if (rx.test(sentence)) {
        found.push(toTitleCase(charName));
      }
    });
    return found.join(', ');
  }

  function splitIntoSentences(text) {
    if (!text) return [];
    var protectedText = text
      .replace(/\b(Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St)\./gi, '$1_DOT_')
      .replace(/\b([A-Z])\./g, '$1_DOT_');
    var rawSentences = protectedText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [protectedText];
    return rawSentences.map(function (s) {
      return s.replace(/_DOT_/g, '.').trim();
    }).filter(Boolean);
  }

  function parseScreenplay(rawText, mode) {
    var withoutBoneyard = String(rawText || '').replace(/\/\*[\s\S]*?\*\//g, function (m) {
      return m.replace(/[^\r\n]/g, '');
    });
    var lines = withoutBoneyard.split(/\r?\n/);
    var elements = [];
    var scenes = [];
    var knownChars = new Set();

    var currentScene = null;
    var activeSection = '';
    var sceneCounter = 0;
    var inDialogue = false;

    for (var i = 0; i < lines.length; i++) {
      var trimmed = lines[i].replace(/\[\[.*?\]\]/g, '').trim();
      if (!trimmed) {
        inDialogue = false;
        continue;
      }

      if (/^\((MORE|CONT['’]D)\)$/i.test(trimmed)) {
        continue;
      }

      var sec = parseSectionLine(trimmed);
      if (sec) {
        inDialogue = false;
        if (sec.level === 1) activeSection = sec.title;
        elements.push({
          id: 'el-' + i,
          type: 'section',
          text: sec.title,
          level: sec.level,
          sceneNum: currentScene ? currentScene.sceneNum : '1'
        });
        continue;
      }

      var syn = parseSynopsisLine(trimmed);
      if (syn !== null) {
        inDialogue = false;
        elements.push({
          id: 'el-' + i,
          type: 'synopsis',
          text: syn,
          sceneNum: currentScene ? currentScene.sceneNum : '1'
        });
        continue;
      }

      var slug = parseSlugline(trimmed);
      if (slug) {
        sceneCounter++;
        var sNum = slug.explicitNum || String(sceneCounter);
        currentScene = {
          sceneNum: sNum,
          section: activeSection,
          intExt: slug.intExt,
          location: slug.location,
          timeOfDay: slug.timeOfDay,
          heading: slug.intExt + ' ' + slug.location + ' - ' + slug.timeOfDay,
          characters: new Set(),
          lastSpeaker: '',
          lastSpeakerIsNarrator: false
        };
        scenes.push(currentScene);
        inDialogue = false;

        elements.push({
          id: 'el-' + i,
          type: 'slugline',
          text: trimmed,
          sceneNum: sNum
        });
        continue;
      }

      if (!currentScene) {
        sceneCounter = 1;
        currentScene = {
          sceneNum: '1',
          section: activeSection,
          intExt: 'INT.',
          location: 'UNSPECIFIED LOCATION',
          timeOfDay: 'DAY',
          heading: 'INT. UNSPECIFIED LOCATION - DAY',
          characters: new Set(),
          lastSpeaker: '',
          lastSpeakerIsNarrator: false
        };
        scenes.push(currentScene);
      }

      if (isTransitionLine(trimmed)) {
        inDialogue = false;
        var cleanTrans = trimmed.charAt(0) === '>' ? trimmed.substring(1).trim() : trimmed;
        elements.push({
          id: 'el-' + i,
          type: 'transition',
          text: cleanTrans,
          sceneNum: currentScene.sceneNum
        });
        continue;
      }

      if (inDialogue && /^\(.*\)$/.test(trimmed)) {
        elements.push({
          id: 'el-' + i,
          type: 'parenthetical',
          text: trimmed,
          sceneNum: currentScene.sceneNum
        });
        continue;
      }

      if (inDialogue) {
        var prev = elements[elements.length - 1];
        if (prev && prev.type === 'dialogue') {
          prev.text += ' ' + trimmed;
        } else {
          elements.push({
            id: 'el-' + i,
            type: 'dialogue',
            text: trimmed,
            character: currentScene.lastSpeaker || 'CHARACTER',
            isNarrator: Boolean(currentScene.lastSpeakerIsNarrator),
            sceneNum: currentScene.sceneNum
          });
        }
        continue;
      }

      var charName = parseCharacterLine(trimmed);
      var nextLine = lines[i + 1] ? lines[i + 1].trim() : '';
      if (charName && nextLine && !parseSlugline(nextLine) && !isTransitionLine(nextLine)) {
        var narratorFlag = isNarratorCue(trimmed, charName);
        if (!narratorFlag) {
          knownChars.add(charName);
          currentScene.characters.add(charName);
        }
        currentScene.lastSpeaker = charName;
        currentScene.lastSpeakerIsNarrator = narratorFlag;
        inDialogue = true;

        elements.push({
          id: 'el-' + i,
          type: 'character',
          text: trimmed,
          character: charName,
          isNarrator: narratorFlag,
          sceneNum: currentScene.sceneNum
        });
        continue;
      }

      var prevAction = elements[elements.length - 1];
      if (prevAction && prevAction.type === 'action' && prevAction.sceneNum === currentScene.sceneNum) {
        prevAction.text += ' ' + trimmed;
      } else {
        elements.push({
          id: 'el-' + i,
          type: 'action',
          text: trimmed,
          sceneNum: currentScene.sceneNum
        });
      }
    }

    var shots = [];
    if (mode !== 'manual') {
      var coveredSpeakers = new Set();

      for (var idx = 0; idx < elements.length; idx++) {
        var el = elements[idx];
        var sc = scenes.find(function (item) { return item.sceneNum === el.sceneNum; });
        if (!sc) continue;

        if (el.type === 'slugline') {
          if (state.includeSluglineShots) {
            var wsDef = getShotDefaults('WS');
            shots.push(createShot({
              sceneNum: el.sceneNum,
              size: 'WS',
              angle: 'Eye Level',
              movement: 'Static',
              lens: wsDef.lens,
              subject: toTitleCase(sc.location),
              description: 'Master establishing shot — ' + sc.heading,
              audioNotes: '',
              estMins: wsDef.mins
            }));
          }
        } else if (el.type === 'action') {
          var sentences = splitIntoSentences(el.text);
          for (var sIdx = 0; sIdx < sentences.length; sIdx++) {
            var sentence = sentences[sIdx].trim();
            if (!sentence) continue;
            var cue = analyzeCameraCues(sentence);
            var subjects = findMentionedCharacters(sentence, knownChars);

            if (mode === 'explicit') {
              if (cue.hasExplicit) {
                var szExp = cue.size || 'MS';
                var defExp = getShotDefaults(szExp);
                shots.push(createShot({
                  sceneNum: el.sceneNum,
                  size: szExp,
                  angle: cue.angle || 'Eye Level',
                  movement: cue.movement || 'Static',
                  lens: defExp.lens,
                  subject: subjects || 'Action / Detail',
                  description: sentence,
                  audioNotes: '',
                  estMins: defExp.mins
                }));
              }
            } else {
              var szFull = cue.size || (subjects ? 'MWS' : 'MS');
              var defFull = getShotDefaults(szFull);
              shots.push(createShot({
                sceneNum: el.sceneNum,
                size: szFull,
                angle: cue.angle || 'Eye Level',
                movement: cue.movement || 'Static',
                lens: defFull.lens,
                subject: subjects || 'Scene Action',
                description: sentence,
                audioNotes: '',
                estMins: defFull.mins
              }));
            }
          }
        } else if (el.type === 'dialogue') {
          if (el.isNarrator) {
            var voSnippet = el.text.length > 60 ? el.text.substring(0, 57) + '...' : el.text;
            var voTag = '[V.O.: "' + voSnippet + '"]';
            var lastVisual = null;
            for (var rev = shots.length - 1; rev >= 0; rev--) {
              if (shots[rev].sceneNum === el.sceneNum) {
                lastVisual = shots[rev];
                break;
              }
            }
            if (lastVisual) {
              lastVisual.audioNotes = lastVisual.audioNotes
                ? lastVisual.audioNotes + ' ' + voTag
                : voTag;
            } else {
              var voDef = getShotDefaults('WS');
              shots.push(createShot({
                sceneNum: el.sceneNum,
                size: 'WS',
                angle: 'Eye Level',
                movement: 'Static',
                lens: voDef.lens,
                subject: toTitleCase(sc.location),
                description: 'Visual coverage under narration — ' + sc.heading,
                audioNotes: voTag,
                estMins: voDef.mins
              }));
            }
            continue;
          }

          if (mode === 'full') {
            var speaker = el.character || 'Character';
            var covKey = el.sceneNum + ':' + speaker;
            if (!coveredSpeakers.has(covKey)) {
              coveredSpeakers.add(covKey);
              var charsArr = Array.from(sc.characters);
              var other = charsArr.find(function (c) { return c !== speaker; });
              var szDlg = other ? 'OTS' : 'MS';
              var defDlg = getShotDefaults(szDlg);
              var lineSnippet = el.text.length > 60 ? el.text.substring(0, 57) + '...' : el.text;

              shots.push(createShot({
                sceneNum: el.sceneNum,
                size: szDlg,
                angle: 'Eye Level',
                movement: 'Static',
                lens: defDlg.lens,
                subject: toTitleCase(speaker),
                description: other
                  ? 'OTS ' + toTitleCase(other) + ' favoring ' + toTitleCase(speaker)
                  : 'Single coverage on ' + toTitleCase(speaker),
                audioNotes: '"' + lineSnippet + '"',
                estMins: defDlg.mins
              }));
            }
          }
        }
      }
    }

    assignShotNumbers(shots);
    return { scenes: scenes, elements: elements, shots: shots };
  }

  function createShot(data) {
    var d = data || {};
    return {
      id: d.id || ('sh-' + Math.random().toString(36).substring(2, 10)),
      sceneNum: String(d.sceneNum || '1'),
      shotNum: d.shotNum || '',
      size: d.size || 'MS',
      angle: d.angle || 'Eye Level',
      movement: d.movement || 'Static',
      lens: d.lens || '35mm',
      subject: d.subject || '',
      description: d.description || '',
      audioNotes: d.audioNotes || '',
      screenSec: Number(d.screenSec) || 3.5,
      estMins: Number(d.estMins) || Number(state.avgSetupMins) || 15
    };
  }

  function indexToAlpha(idx) {
    var out = '';
    var n = idx;
    while (n >= 0) {
      out = String.fromCharCode((n % 26) + 65) + out;
      n = Math.floor(n / 26) - 1;
    }
    return out;
  }

  function assignShotNumbers(list) {
    var counts = {};
    for (var i = 0; i < list.length; i++) {
      var sc = list[i].sceneNum || '1';
      if (counts[sc] == null) counts[sc] = 0;
      list[i].shotNum = sc + indexToAlpha(counts[sc]++);
    }
  }

