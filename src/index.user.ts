// ==UserScript==
// @name         WaniKani Hotwired Framework
// @namespace    https://theusaf.org
// @author       theusaf
// @description  A framework for writing scripts for WaniKani, focused on WaniKani's Hotwired actions.
// @version      1.0.0
// @match        https://www.wanikani.com/*
// @match        https://preview.wanikani.com/*
// @copyright    2023 theusaf
// @license      MIT
// @run-at       document-start
// @grant        none
// ==/UserScript==

import {
  EventListenerCallback,
  LocationMatcher,
  ScriptCallback,
  WaniKaniEvents,
  WKHFScriptParams,
} from "./types/window";
import {
  TurboBeforeCacheEvent,
  TurboBeforeVisitEvent,
  TurboLoadEvent,
} from "@Hotwired/turbo";

enum Events {
  /**
   * Fired when the connection is lost.
   */
  ConnectionTimeout = "connectionTimeout",
  /**
   * Fired when a question is answered.
   */
  QuestionAnswered = "didAnswerQuestion",
  /**
   * Fired when a subject is completed.
   */
  SubjectCompleted = "didCompleteSubject",
  /**
   * Fired when the SRS level of a subject changes.
   */
  SRSChanged = "didChangeSRS",
  /**
   * Fired when the user's synonyms are updated.
   */
  UserSynonymsUpdated = "didUpdateUserSynonyms",
  /**
   * Fired when a wrap-up observer is registered.
   */
  WrapUpObserverRegistration = "registerWrapUpObserver",
  /**
   * Fired when the quiz progress is updated.
   */
  QuizProgressUpdated = "updateQuizProgress",
  /**
   * Fired when the next question is about to be displayed.
   */
  NextQuestionWillDisplay = "willShowNextQuestion",
  /**
   * Fired when audio is about to play.
   */
  AudioWillPlay = "audioWillPlay",
  /**
   * Fired when content is about to be opened.
   */
  ContentWillOpen = "willOpenContent",
}

(function () {
  // ~~ Event Listening
  const wkhfListeners = new Map<
    keyof WaniKaniEvents,
    Set<EventListenerCallback<keyof WaniKaniEvents>>
  >();

  for (const event of Object.keys(Events)) {
    window.addEventListener(event, (event) => {
      const type = event.type as keyof WaniKaniEvents;
      if (!wkhfListeners.has(type)) return;
      for (const listener of wkhfListeners.get(type)) {
        listener(event as CustomEvent);
      }
    });
  }

  // Loading/unloading scripts
  class WKHFScript {
    locationMatcher: LocationMatcher;
    isActivated: boolean;
    ignoreActiveState: boolean;
    onBeforeVisit?: ScriptCallback<TurboBeforeVisitEvent>;
    onBeforeCache?: ScriptCallback<TurboBeforeCacheEvent>;
    onLoad?: ScriptCallback<TurboLoadEvent>;
    #deactivate?: () => void;
    #activate?: () => void;

    constructor({
      locationMatcher,
      ignoreActiveState = false,
      onBeforeVisit,
      onBeforeCache,
      onLoad,
      activate,
      deactivate,
    }: WKHFScriptParams) {
      this.locationMatcher = locationMatcher;
      this.onBeforeVisit = onBeforeVisit;
      this.onBeforeCache = onBeforeCache;
      this.onLoad = onLoad;
      this.#activate = activate;
      this.#deactivate = deactivate;
      this.isActivated = false;
      this.ignoreActiveState = ignoreActiveState;
    }

    activate() {
      this.isActivated = true;
      this.#activate?.();
    }
    deactivate() {
      this.isActivated = false;
      this.#deactivate?.();
    }

    setOnBeforeVisit(onBeforeVisit: ScriptCallback<TurboBeforeVisitEvent>) {
      this.onBeforeVisit = onBeforeVisit;
    }
    setOnBeforeCache(onBeforeCache: ScriptCallback<TurboBeforeCacheEvent>) {
      this.onBeforeCache = onBeforeCache;
    }
    setOnLoad(onLoad: ScriptCallback<TurboLoadEvent>) {
      this.onLoad = onLoad;
    }
    setActivate(activate: () => void) {
      this.#activate = activate;
    }
    setDeactivate(deactivate: () => void) {
      this.#deactivate = deactivate;
    }

    doesLocationMatch(url: string) {
      switch (typeof this.locationMatcher) {
        case "string": {
          // treat like a glob
          const glob = this.locationMatcher
            .replace(/\./g, "\\.")
            .replace(/\*/g, ".*")
            .replace(/\?/g, ".");
          const regex = new RegExp(glob);
          return regex.test(url);
        }
        case "function":
          return this.locationMatcher(url);
        case "object":
          return this.locationMatcher.test(url);
      }
    }
  }
  const wkhfScripts = new Map<string, WKHFScript>();
  window.addEventListener(
    "turbo:before-visit",
    (event: TurboBeforeVisitEvent) => {
      for (const script of wkhfScripts.values()) {
        if (script.isActivated || script.ignoreActiveState) {
          script.onBeforeVisit?.(event);
        }
      }
    }
  );
  window.addEventListener(
    "turbo:before-cache",
    (event: TurboBeforeCacheEvent) => {
      for (const script of wkhfScripts.values()) {
        if (script.isActivated || script.ignoreActiveState) {
          script.onBeforeCache?.(event);
          if (script.isActivated) script.deactivate();
        }
      }
    }
  );
  window.addEventListener("turbo:load", (event: TurboLoadEvent) => {
    for (const script of wkhfScripts.values()) {
      if (script.doesLocationMatch(window.location.href)) {
        script.onLoad?.(event);
        if (!script.isActivated) script.activate();
      }
    }
  });

  // ———————————————————————————— Public Methods ————————————————————————————

  function addEventListener<K extends keyof WaniKaniEvents>(
    event: K,
    listener: EventListenerCallback<K>
  ) {
    if (!wkhfListeners.has(event)) wkhfListeners.set(event, new Set());
    wkhfListeners.get(event).add(listener);
  }

  function removeEventListener<K extends keyof WaniKaniEvents>(
    event: K,
    listener: EventListenerCallback<K>
  ) {
    if (!wkhfListeners.has(event)) return;
    wkhfListeners.get(event).delete(listener);
  }

  function registerScript(name: string, script: WKHFScriptParams) {
    if (wkhfScripts.has(name))
      throw new Error(`Script '${name}' already exists`);
    wkhfScripts.set(name, new WKHFScript(script));
    return wkhfScripts.get(name);
  }
  function unregisterScript(name: string) {
    wkhfScripts.delete(name);
  }
  function fetchScript(name: string) {
    return wkhfScripts.get(name);
  }

  window.wkhf = {
    version: "1.0.0",
    addEventListener,
    removeEventListener,
    Events,
    registerScript,
    unregisterScript,
    fetchScript,
  };
})();
