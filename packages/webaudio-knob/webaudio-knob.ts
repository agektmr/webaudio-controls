import { customElement, property, html, svg } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { styleMap, StyleInfo } from 'lit-html/directives/style-map';
import { WebAudioControlsWidget } from '../base/webaudio-controls-widget';

@customElement('webaudio-knob')
export class WebAudioKnob extends WebAudioControlsWidget {
  @property({
    type: String,
    reflect: true
  })
  src: string = ''

  @property({
    type: Number,
    reflect: true,
    hasChanged(newVal, oldVal) {
      if (this.value < this.min) return false;
      if (this.value > this.max) return false;
      return true;
    }
  })
  value: number = 0

  @property({
    type: Number,
    reflect: true
  })
  defvalue: number = 0

  @property({
    type: Number,
    reflect: true
  })
  min: number = 0

  @property({
    type: Number,
    reflect: true
  })
  max: number = 100

  @property({
    type: Number
  })
  step: number = 1

  @property({
    type: Number,
    reflect: true
  })
  width: number = 0

  @property({
    type: Number,
    reflect: true
  })
  height: number = 0

  @property({
    type: Number,
    reflect: true
  })
  diameter: number = 64

  @property({
    type: Number,
    reflect: true
  })
  sprites: number = 0

  @property({
    type: Number,
    reflect: true
  })
  sensitivity: number = 1

  @property({
    type: Boolean,
    reflect: true
  })
  valuetip: boolean = true

  @property({
    type: String,
    reflect: true
  })
  tooltip: string = ''

  @property({
    type: String,
    reflect: true
  })
  conv: string = ''

  @property({
    type: String
  })
  convValue: string = ''

  @property({
    type: Boolean,
    reflect: true
  })
  enable: boolean = true

  @property({
    type: String,
    reflect: true
  })
  colors: string = '#e00;#000;#000'

  @property({
    type: Array
  })
  private coltab: string[] = ['#e00', '#000', '#000'];

  @property({
    type: Boolean,
    reflect: true
  })
  outline: boolean = true

  @property({
    type: Boolean,
    reflect: true
  })
  midilearn: boolean = false

  @property({
    type: String,
    reflect: true
  })
  midicc: string = ''

  private knob: HTMLElement
  private ttframe: HTMLElement
  private styles: any = {}

  constructor() {
    super();
  }

  public render() {
    let digits = 0;

    if (this.step && this.step < 1) {
      for (let n = this.step; n < 1; n *= 10)
        ++digits;
    }
    let range = this.max - this.min;
    let sp = this.src ? this.sprites : 100;
    if (sp >= 1) {
      const offset = ((sp * (this.value - this.min) / range) | 0);
      this.styles.backgroundPosition = `0px ${(-offset * this.kh)}px`;
      this.styles.transform = 'rotate(0deg)';
    } else {
      const deg = 270 * ((this.value - this.min) / range - 0.5);
      this.styles.backgroundPosition = `0px 0px`;
      this.styles.transform = `rotate(${deg}deg)`;
    }
    return html`<style>
      ${this.basestyle}
        :host {
          display:inline-block;
          position:relative;
          margin:0;
          padding:0;
          cursor:pointer;
          font-family: sans-serif;
          font-size: 11px;
        }
        .webaudio-knob-body {
          display:inline-block;
          position:relative;
          margin:0;
          padding:0;
          vertical-align:bottom;
        }
      </style>
      <div
        id="knob-body"
        class="webaudio-knob-body"
        tabindex="1"
        style=${styleMap(this.styles)}
        touch-action="none"></div>
      <div
        id="tooltip"
        class="webaudioctrl-tooltip"></div>`;
  }

  public connectedCallback() {
    this.knob = this.querySelector('#knob-body');
    this.ttframe = this.querySelector('#tooltip');
    if (this.conv) {
      const x = this._value;
      this.convValue = eval(this.conv);
      if (typeof (this.convValue) == "function")
        this.convValue = this.convValue(x);
    } else
      this.convValue = this._value;

    this.midiController = {};
    this.midiMode = "normal";

    if (this.midicc) {
      let ch = parseInt(this.midicc.substring(0, this.midicc.lastIndexOf("."))) - 1;
      let cc = parseInt(this.midicc.substring(this.midicc.lastIndexOf(".") + 1));
      this.setMidiController(ch, cc);
    }
    this.setupImage();

    if (window.webAudioControlsMidiManager)
      window.webAudioControlsMidiManager.addWidget(this);
  }

  public disconnectedCallback() {}

  public renderSVG(): string {
    if (this.src) return null;

    if (this.colors)
      this.coltab = this.colors.split(";");
    if (!this.coltab)
      this.coltab = ["#e00", "#000", "#000"];

    const uses = [];
    for (let i = 0; i < 101; i++) {
      const y = 64 * i;
      const rotate = (-135+270*i/101).toFixed(2);
      uses.push(`<use xlink:href="#B" y="${y}"/>
        <use xlink:href="#K" y="${y}"
        transform="rotate(${rotate},32,${y+32})"/>`);
    }
    return `url(data:image/svg+xml;base64,${btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="64" height="6464" preserveAspectRatio="none">
      <radialGradient id="gr" cx="30%" cy="30%">
        <stop offset="0%" stop-color="${this.coltab[2]}"/>
        <stop offset="100%" stop-color="${this.coltab[1]}"/>
      </radialGradient>
      <defs>
        <circle id="B" cx="32" cy="32" r="30" fill="url(#gr)"/>
      </defs>
      <defs>
        <line id="K" x1="32" y1="28" x2="32" y2="7" stroke-linecap="round" stroke-width="6" stroke="${this.coltab[0]}"/>
      </defs>
      ${uses.join('')}
    </svg>`)})`;
  }

  public setupImage(): void {
    this.kw = this.width || this.diameter;
    this.kh = this.height || this.diameter;

    if (!this.src) {
      this.styles.backgroundImage = this.renderSVG();
      this.styles.backgroundSize = `${this.kw}px ${this.kh*101}px`;
    } else {
      this.styles.backgroundImage = `url(${this.src})`;
      if (!this.sprites)
        this.styles.backgroundSize = "100% 100%";
      else {
        this.styles.backgroundSize = `${this.kw}px ${this.kh*(this.sprites+1)}px`;
      }
    }
    this.styles.outline = this.outline ? '' : 'none';
    this.styles.width = `${this.kw}px`;
    this.styles.height = `${this.kh}px`;
    this.style.height = `${this.kh}px`;
    this.render();
  }

  private _setValue(v): number {
    if (this.step)
      v = (Math.round((v - this.min) / this.step)) * this.step + this.min;
    this._value = Math.min(this.max, Math.max(this.min, v));
    if (this._value != this.oldvalue) {
      this.oldvalue = this._value;
      if (this.conv) {
        const x = this._value;
        this.convValue = eval(this.conv);
        if (typeof (this.convValue) == "function")
          this.convValue = this.convValue(x);
      } else
        this.convValue = this._value;
      this.render();
      this.showtip(0);
      return 1;
    }
    return 0;
  }

  public setValue(v: number, f: boolean): void {
    if (this._setValue(v) && f)
      this.sendEvent('input'), this.sendEvent('change');
  }

  public wheel(e): void {
    if (!this.enable) return;

    e.preventDefault();
    e.stopPropagation();

    let delta = (this.max - this.min) * 0.01;
    delta = e.deltaY > 0 ? -delta : delta;
    if (!e.shiftKey) delta *= 5;
    if (Math.abs(delta) < this.step)
      delta = (delta > 0) ? +this.step : -this.step;

    this.setValue(+this.value + delta, true);
  }

  public pointerdown(ev): boolean {
    if (!this.enable) return;

    let e = ev;
    let identifier, lastShift, startPosX, startPosY, startVal;

    if (ev.touches) {
      e = ev.changedTouches[0];
      identifier = e.identifier;
    } else if (e.buttons != 1 && e.button != 0) {
      return;
    }

    this.knob.focus();
    this.drag = 1;
    this.showtip(0);

    const pointermove = (ev): boolean => {
      let e = ev;
      if (ev.touches) {
        for (let i = 0; i < ev.touches.length; ++i) {
          if (ev.touches[i].identifier == identifier) {
            e = ev.touches[i];
            break;
          }
        }
      }
      if (lastShift !== e.shiftKey) {
        lastShift = e.shiftKey;
        startPosX = e.pageX;
        startPosY = e.pageY;
        startVal = this.value;
      }
      let offset = (startPosY - e.pageY - startPosX + e.pageX) * this.sensitivity;
      this._setValue(this.min + ((((startVal + (this.max - this.min) * offset / ((e.shiftKey ? 4 : 1) * 128)) - this.min) / this.step) | 0) * this.step);
      this.sendEvent("input");
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
      return false;
    }

    const pointerup = (ev): void => {
      let e = ev;
      if (ev.touches) {
        for (let i = 0;;) {
          if (ev.changedTouches[i].identifier == identifier) {
            break;
          }
          if (++i >= ev.changedTouches.length)
            return;
        }
      }
      this.drag = 0;
      this.showtip(0);
      startPosX = startPosY = null;
      window.removeEventListener('mousemove', pointermove);
      window.removeEventListener('touchmove', pointermove, {
        passive: false
      });
      window.removeEventListener('mouseup', pointerup);
      window.removeEventListener('touchend', pointerup);
      window.removeEventListener('touchcancel', pointerup);
      document.body.removeEventListener('touchstart', preventScroll, {
        passive: false
      });
      this.sendEvent("change");
    }

    let preventScroll = (e) => {
      e.preventDefault();
    }

    if (e.ctrlKey || e.metaKey) {
      this.setValue(this.defvalue, true);
    } else {
      startPosX = e.pageX;
      startPosY = e.pageY;
      startVal = this.value;
      window.addEventListener('mousemove', pointermove);
      window.addEventListener('touchmove', pointermove, {
        passive: false
      });
    }
    window.addEventListener('mouseup', pointerup);
    window.addEventListener('touchend', pointerup);
    window.addEventListener('touchcancel', pointerup);
    document.body.addEventListener('touchstart', preventScroll, {
      passive: false
    });
    ev.preventDefault();
    ev.stopPropagation();
    return false;
  }
};

customElements.define("webaudio-knob", WebAudioKnob);