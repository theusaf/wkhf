declare module "controllers/body_controller" {
  import { Controller } from "@hotwired/stimulus";
  export default class extends Controller {
    static classes: string[];
    /**
     * Freezes the body.
     */
    freeze(): void;
    /**
     * Unfreezes the body.
     */
    unfreeze(): void;
    get frozenClass(): string;
    get frozenClasses(): string;
    get hasFrozenClass(): boolean;
  }
}
