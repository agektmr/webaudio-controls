/// <reference path="../../node_modules/@types/webmidi/index.d.ts" />

export class WebAudioControlsMidiManager {
  public midiAccess = null
  public listOfWidgets: [] = []
  public listOfExternalMidiListeners: [] = []

  constructor(){
    this.midiAccess = null;
    this.listOfWidgets = [];
    this.listOfExternalMidiListeners = [];
    this.updateWidgets();
    this.initWebAudioControls();
  }

  public addWidget(w): void {
    this.listOfWidgets.push(w);
  }

  public updateWidgets(): void {
//      this.listOfWidgets = document.querySelectorAll("webaudio-knob,webaudio-slider,webaudio-switch");
  }

  public initWebAudioControls(): void {
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess()
      .then(midiAccess => {
        this.midiAccess = midiAccess;
        this.enableInputs();
      }, err => {
        console.log(`MIDI not initialized - error encountered: ${err.code}`)
      });
    }
  }

  public enableInputs(): void {
    let inputs = this.midiAccess.inputs.values();
    console.log(`Found ${this.midiAccess.inputs.size} MIDI input(s)`);
    for (let input = inputs.next(); input && !input.done; input = inputs.next()) {
      console.log(`Connected input: ${input.value.name}`);
      input.value.onmidimessage = this.handleMIDIMessage.bind(this);
    }
  }

  public midiConnectionStateChange(e): void {
    console.log(`connection: ${e.port.name} ${e.port.connection} ${e.port.state}`);
    this.enableInputs();
  }

  public onMIDIStarted(midi) {
    this.midiAccess = midi;
    midi.onstatechange = this.midiConnectionStateChange;
    enableInputs(midi);
  }

  // Add hooks for external midi listeners support
  public addMidiListener(callback) {
    this.listOfExternalMidiListeners.push(callback);
  }

  public getCurrentConfigAsJSON() {
    return currentConfig.stringify();
  }

  public handleMIDIMessage(event) {
    this.listOfExternalMidiListeners.forEach(externalListener => {
      externalListener(event);
    });

    if (((event.data[0] & 0xf0) == 0xf0)
     || ((event.data[0] & 0xf0) == 0xb0
     &&   event.data[1] >= 120)) return;

    for (let w of this.listOfWidgets) {
      if (w.processMidiEvent) w.processMidiEvent(event);
    }

    if (opt.mididump) console.log(event.data);
  }

  public contextMenuOpen(e,knob){
    if (!this.midiAccess) return;

    const menu = document.getElementById('webaudioctrl-context-menu');

    menu.style.left = `${e.pageX}px`;
    menu.style.top = `${e.pageY}px`;
    menu.knob = knob;
    menu.classList.add('active');
    menu.knob.focus();
//      document.activeElement.onblur=this.contextMenuClose;
    menu.knob.addEventListener('keydown', this.contextMenuCloseByKey.bind(this));
  }

  public contextMenuCloseByKey(e){
    if (e.keyCode == 27) this.contextMenuClose();
  }

  public contextMenuClose(){
    let menu=document.getElementById("webaudioctrl-context-menu");
    menu.knob.removeEventListener("keydown",this.contextMenuCloseByKey);
    menu.classList.remove("active");
    let menuItemLearn=document.getElementById("webaudioctrl-context-menu-learn");
    menuItemLearn.innerHTML = 'Learn';
    menu.knob.midiMode = 'normal';
  }

  public contextMenuLearn(){
    let menu = document.getElementById("webaudioctrl-context-menu");
    let menuItemLearn =. document.getElementById("webaudioctrl-context-menu-learn");
    menuItemLearn.innerHTML = 'Listening...';
    menu.knob.midiMode = 'learn';
  }

  public contextMenuClear(e){
    const menu = document.getElementById("webaudioctrl-context-menu");
    menu.knob.midiController = {};
    this.contextMenuClose();
  }
}

if (window.UseWebAudioControlsMidi || opt.useMidi)
  window.webAudioControlsMidiManager = new WebAudioControlsMidiManager();
