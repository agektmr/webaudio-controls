import { LitElement } from 'lit-element';

export class WebAudioControlsWidget extends LitElement {
  public hover: number = 0
  public drag: number = 0
  public basestyle: string = `
    .webaudioctrl-tooltip{
      display:inline-block;
      position:absolute;
      margin:0 -1000px;
      z-index: 999;
      background:#eee;
      color:#000;
      border:1px solid #666;
      border-radius:4px;
      padding:5px 10px;
      text-align:center;
      left:0; top:0;
      font-size:11px;
      opacity:0;
      visibility:hidden;
    }
    .webaudioctrl-tooltip:before{
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -8px;
      border: 8px solid transparent;
      border-top: 8px solid #666;
    }
    .webaudioctrl-tooltip:after{
      content: "";
      position: absolute;
      top: 100%;
      left: 50%;
      margin-left: -6px;
      border: 6px solid transparent;
      border-top: 6px solid #eee;
    }`

  constructor() {
    super();
    this.addEventListener("keydown", this.keydown);
    this.addEventListener("mousedown", this.pointerdown, {
      passive: false
    });
    this.addEventListener("touchstart", this.pointerdown, {
      passive: false
    });
    this.addEventListener("wheel", this.wheel, {
      passive: false
    });
    this.addEventListener("mouseover", this.pointerover);
    this.addEventListener("mouseout", this.pointerout);
    this.addEventListener("contextmenu", this.contextMenu);
    document.body.appendChild(midimenu);
  }

  public sendEvent(eventName: string): void {
    const event = new CustomEvent(eventName, {
      bubbles: false,
      cancelable: true
    });
    this.dispatchEvent(event);
  }

  public getAttr(n, def) {
    let v = this.getAttribute(n);
    if (v === '' || v === null) return def;
    switch (typeof (def)) {
      case "number":
        if (v == "true") return 1;
        v = +v;
        if (isNaN(v)) return 0;
        return v;
    }
    return v;
  }

  public showtip(d) {
    function valstr(x, c, type) {
      switch (type) {
        case "x":
          return (x | 0).toString(16);
        case "X":
          return (x | 0).toString(16).toUpperCase();
        case "d":
          return (x | 0).toString();
        case "f":
          return x.toFixed(c);
        case "s":
          return x.toString();
      }
      return "";
    }

    function numformat(s, x) {
      if (typeof (x) == "undefined")
        return;
      let i = s.indexOf("%");
      let c = [0, 0],
        type = 0,
        m = 0,
        r = "",
        j = i + 1;
      for (; j < s.length; ++j) {
        if ("dfxXs".indexOf(s[j]) >= 0) {
          type = s[j];
          break;
        }
        if (s[j] == ".")
          m = 1;
        else
          c[m] = c[m] * 10 + parseInt(s[j]);
      }
      if (typeof (x) == "number")
        r = valstr(x, c[1], type);
      else
        r = valstr(x.x, c[1], type) + "," + valstr(x.y, c[1], type);
      if (c[0] > 0)
        r = ("               " + r).slice(-c[0]);
      r = s.replace(/%.*[xXdfs]/, r);
      return r;
    }
    let s = this.tooltip;

    if (this.drag || this.hover) {
      if (this.valuetip) {
        if (s == null)
          s = `%.${this.digits}f`;
        else if (s.indexOf("%") < 0)
          s += ` : %.${this.digits}f`;
      }

      if (s) {
        this.ttframe.innerHTML = numformat(s, this.convValue);
        this.ttframe.style.display = "inline-block";
        this.ttframe.style.width = "auto";
        this.ttframe.style.height = "auto";
        this.ttframe.style.transition = "opacity 0.5s " + d + "s,visibility 0.5s " + d + "s";
        this.ttframe.style.opacity = 0.9;
        this.ttframe.style.visibility = "visible";
        let rc = this.getBoundingClientRect(),
          rc2 = this.ttframe.getBoundingClientRect(),
          rc3 = document.documentElement.getBoundingClientRect();
        this.ttframe.style.left = ((rc.width - rc2.width) * 0.5 + 1000) + "px";
        this.ttframe.style.top = (-rc2.height - 8) + "px";
        return;
      }
    }

    this.ttframe.style.transition = `opacity 0.1s ${d}s,visibility 0.1s ${d}s`;
    this.ttframe.style.opacity = 0;
    this.ttframe.style.visibility = "hidden";
  }

  public pointerover(e) {
    this.hover = 1;
    this.showtip(0.6);
  }

  public pointerout(e) {
    this.hover = 0;
    this.showtip(0);
  }

  public contextMenu(e): void {
    if (window.webAudioControlsMidiManager && this.midilearn)
      webAudioControlsMidiManager.contextMenuOpen(e, this);
    e.preventDefault();
    e.stopPropagation();
  }

  public setMidiController(channel, cc) {
    if (this.listeningToThisMidiController(channel, cc)) return;
    this.midiController = {
      'channel': channel,
      'cc': cc
    };
    console.log(`Added mapping for channel=${channel} cc=${cc} tooltip=${this.tooltip}`);
  }

  public listeningToThisMidiController(channel, cc) {
    const c = this.midiController;
    if ((c.channel === channel || c.channel < 0) && c.cc === cc)
      return true;
    return false;
  }

  public processMidiEvent(event) {
    const channel = event.data[0] & 0xf;
    const controlNumber = event.data[1];
    if (this.midiMode == 'learn') {
      this.setMidiController(channel, controlNumber);
      webAudioControlsMidiManager.contextMenuClose();
      this.midiMode = 'normal';
    }
    if (this.listeningToThisMidiController(channel, controlNumber)) {
      if (this.tagName == "WEBAUDIO-SWITCH") {
        switch (this.type) {
          case "toggle":
            if (event.data[2] >= 64)
              this.setValue(1 - this.value, true);
            break;
          case "kick":
            this.setValue(event.data[2] >= 64 ? 1 : 0);
            break;
          case "radio":
            let els = document.querySelectorAll(`webaudio-switch[type="radio"][group="${this.group}"]`);
            for (let i = 0; i < els.length; ++i) {
              if (els[i] == this)
                els[i].setValue(1);
              else
                els[i].setValue(0);
            }
            break;
        }
      } else {
        const val = this.min + (this.max - this.min) * event.data[2] / 127;
        this.setValue(val, true);
      }
    }
  }
}