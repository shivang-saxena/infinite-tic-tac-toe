import { Howl } from "howler";

export const sounds = {
  move: new Howl({
    src: ["/sounds/move.mp3"],
    volume: 0.5,
  }),
  win: new Howl({
    src: ["/sounds/win.mp3"],
    volume: 0.7,
  }),
  click: new Howl({
    src: ["/sounds/click.mp3"],
    volume: 0.5,
  }),
};
