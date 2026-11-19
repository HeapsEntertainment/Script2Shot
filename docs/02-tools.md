# Toolbar
The following documentation covers all of the tools and utilities in the main app toolbar.

## File
Main menu for opening, saving/loading, generating, and exporting project files.

## Settings
Change or modify the project settings. These are the same settings as seen in the import modal.

### Format Preset
* Live Action (Full Frame)
* Live Action (Super 35)
* 2D Animation (Field Sizes)
* 3D/CGI (Virtual Camera)
* Documentary/Run & Gun

### Coverage Parser
* Action+Dialouge
* Explicit Camera Cues Only
* Manual Highlight-to-Shot

## Advanced
* __Preset & Shot Taxonomy:__ View and edit information for shot types and movements.
* __Kayboard Shortcuts:__ View and edit keyboard shortcuts.
* __Branding Options:__ Add and edit branding options for shotlist exports.
* __Recalculate Scene Runtimes:__ Similar funtion to the _Retime_ button.
* __Auto-Number All Shots:__ Similar function to the _Auto-Number_ button.

## Help
View documentation, tutorials, and other information.

## Title
Edit your project's title.

## Save status Badge
A badge displaying your project's save status, and save time.

## Generate Shots
A button to generate shots. Useful for udating the shotlist to match the script.

# Project Options Bar
The following documentation covers all of the tools and utilities in the _Project Options Bar_.

## Scenes
A counter displaying the number of scenes in the project.

## Shots
A counter displaying the number of shots in the project.

## Screen Runtime
A fied displaying the estimated runtime of the project. This field can bed edited to match the runtime in your script editor (note the result may be off by 1 second or so, depending on the project.)

## Est. Shoot Time
The Estimated Shoot Time for the project. This can be changed by changing the _Shoot (M)_ for each shot, as well as the _Avgerage Minutes Per Shot_.
(Note: Est. Shoot Time is not available for 2D or 3D projects.)

## Est. Render Time
The Estimated Render Time for the project. This can be changed by changing the _Render (M)_ for each shot, as well as the _Engine_ (for 3D), _Quality_, _FPS_, and _Rate_.
(Note: Est. Render Time is not available for live action projects.)

## (## Frames)
The Frame Estimate guesses how many frames are likely to be in the finished project.
(Note: Frame Estimate is not available for live action projects.)

## 2D/3D Settings
The 2D/3D settings bar is available only for 2D and 3D projects, and is used to edit settings that impact render time estimatations.

### Software/Engine
A drop-down for selecting the software and render engine for the project.

#### 2D Animation
* Blender Grease Pencil (Eevee)
* Blender Grease Pencil (Cycles)
* Toon Boom Harmony
* TVPaint/Traditional Raster 2D

#### 3D/CGI
* Blender (Eevee)
* Blender (Cycles)
* Unreal Engine (Lumen/Path Tracer)
* Maya/Arnold Raytracer

### Quality
A drop-down for the project resolution.
* 1080p Draft (32 smp)
* 1080p Med (64 smp)
* 4K Med (128 smp)
* 4K High (512 smp)

### FPS
An editible field for the project framerate (24 default).

### Rate
Seconds of render time per 1 second of animation.

## Retime
A button to distribute each scene's screen runtime proportionally across its shots.

## Dir
A field to set the project's main Director.

## Prod
A field to set the project's main Producer.

## Shot Type Counters
The Shot Type Counters are small 2-3 letter labels, followed by a number, which count how many times each type of shot is used in the shtlist (hidden if the specific sht type is used less then once).

# Script Pane
The following documentation covers all of the tools in the _Script Pane_, inluding the _Interactive Script_ and _Script Editor_ tabs. The Script Editor is not designed for full script creation - although it can be used to do so - instead it can be used for last-minute changes/adjustments.
The right edge of the Script Pane can be dragged to resize it, or you can hide it completely with the _Collapse Script_ button.

## Interactive Script
### Add shot from selection
Highlight any text in Interactive Script to add a shot. Only works in Interactive Script Mode.
### Script Text
The script text is automatically sectioned by act and scene, based on your screenplay, and can contain the following non-interactive parts:
* Act Headers.
* Scene Headers. Scene headers can also bes used to generate establishing shots by default under the _Generate Scene Master Shots_ setting.
>* Scene Number (SC#)
* Action/Description
* Camera Cues. Text anywhere in the script which is recognised as a camera cue of shot type, for example: crane, establishing, CU, etc.
* Character Name Dialogue Tag
>* V.O. Tag. Hover next to a character name dialogue tag, and you will see an option to mark a character as V.O. (Voice Only). Any character called _Narrator_ is marked V.O. by defaylt. Click the button to add or remove.
* Transitions. Transitions are not counted automatically as seperate shots.

## Script Editor
Chnages in the script editor can't be updated in the shotlist unless you switch back to _Interactive Script_ mode, or select _Apply & View Script_.
* Text Editor pane. Simple text editing.
* Bottom Toolbar. Home to:
>* Undo
>* Redo
>* Apply & View Script

## Sample Script
Import a Sample Script
## Upload .txt/.fountain
Upload a script from your device, in .txt or .fountain format.
## Collapse Script Panel/Show Script
Hide or show the Script Pane.

# Shot Editor
The following documentation covers all of the tools in the _Shot Editor_.

## Filters & Actions Toolbar
### Scene
The Scene bar allows you to choose between editing:
* All Scenes, or
* Individual Scenes, by selecting the specific scene you wish to edit.

### Size
The Size bar allows you to filter by shot size or type:

* EWS
* WS
* FS
* MWS
* MS
* MCU
* CU
* ECU
* INS
* OTS
* POV
* TWO-SHOT

> You can also add your own shot types in _Advanced>Presets & Shot Taxonomy>Custom Shot Types_. See _Presets & Shot Taxonomy_ under _Settings & Customisation_ for more information.

### Search
The Search bar allows you to flter the shots by searching by subject, action, diallogie, or any other term.

## Undo & Redo
Undo & Redo previous actions in the Shot Editor. Does not apply to the script editor.

### Auto-Number
Sometimes if a shot is manually moved to a different scene, the Shot Numbers may no longer be in order. This can be easily fixed by clicking the Auto-Number button.
(See _Shot#_ for more information.)

### Add Shot

Adds a new blank shot to the bottom of the shot list.

## Collumns
The Shot Editor is sorted into collums. The layout will remain identical if exported into fortmats such as .xls.

>Ttp: Sellect a row in the shot editor to jump to the corresponding beat in the script editor.

### Scene
The Scene Number accoiated with each shot. A shot can be moved to a different scene by editing this number.

### Shot#
The Shot Number is an ID - typically a number followed by a letter - for idenifying each shot in the scene. By default this number matched the scene number, but can be changed without moving the shot to a different scene.
If a shot is moved to a different scene, and the Shot Numbers are no longer in order, they can easily be fixed ith the Auto-Number button. (See _Auto-Number_ for more information.)

### Size ⓘ
The Size ⓘ drop-down allows you to change the shot size. Hover over the dropdown to see a tooltip explaining the selected shot name.

See _Size_ under _Filters & Actions Toolbar_ for a list of the different shots.

> You can also add your own shot types in _Advanced>Presets & Shot Taxonomy>Custom Shot Types_. See _Presets & Shot Taxonomy_ under _Settings & Customisation_ for more information.

### Angle
The Angle drop-down allows you to chooose the camera angle:

* Eye Level
* High Angle
* Low Angle
* Dutch
* Overhead

### Movement
The Movement drop-down allows you to choose if the camera has any movement in the shot, and the movement type:

* Static
* Pan
* Tilt
* Dolly
* Track
* Handheld
* Steadicam
* Crane/Jib
* Zoom

> You can also add your own shot movement types in _Advanced>Presets & Shot Taxonomy>Custom Movements_. See _Presets & Shot Taxonomy_ under _Settings & Customisation_ for more information.

### Lense/Field
The Lense/Field drop-down allows you to choose a variety of lense options, basedon the type of project you are working on. The lenses are also automatically adjusted based on the shot size or type.

> #### Live Action (Full Frame)
>* 16mm
>* 24mm
>* 28mm
>* 35mm
>* 50mm
>* 85mm
>* 100mm Macro
>* 135mm
>* 24-70mm

> #### Live Action (Super 35)
>* 12mm
>* 14mm
>* 18mm
>* 24mm
>* 28mm
>* 35mm
>* 40mm
>* 65mm
>* 85mm
>* 18-55mm

> #### 2D Animation (Field Sizes)
>* 16-Field
>* 12-Field
>* 10-Field
>* 8-Field
>* 6-Field
>* 4-Field
>* 3-Field
>* 2-Field
>* Multiplane

> #### 3D / CGI (Virtual Camera)
>* 18mm Virtual
>* 24mm Virtual
>* 35mm Virtual
>* 50mm Virtual
>* 85mm Virtual
>* 135mm Virtual
>* Ortho

### Subject/Cast
The Subject/Cast field is for setting the subject of the specific shot - such as a caharacter or cats member, a vehicle, location, etc.

### Description/Action
The Description/Action is a short summaris version of the action in the script, defining the action or description of the shot.

### Audio/V.O. Notes
A field for entering lines of dialogue - either spoken but one of the characters, or as a voice over (V.O.) - or notes about sound effects, or music tracks.

### Screen (S)
The Screen (S) field disctates how many seconds the shot lasts.

### Shoot (M)
_Note: Shoot (M) is not visible for 2D and #D projects, and is replaced by Render (M)_
The Shoot (M) field is an estimate how long the shot is likely to take to shoot, including setup, takes, etc.

### Render (M)
_Note: Render (M) is only visible for 2D and #D projects, and is replaced by Shoot (M) for all other projects_
The Render (M) field is an estimate how long the shot is likely to take to render. This is calculated based on the render settings in the main app toolbar.

### Actions
The Actions collum has 4 buttons for fast shot editing

* Move Up
* Move Down
* Duplicate
* Delete
