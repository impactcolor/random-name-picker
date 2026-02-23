interface SlotConfigurations {
  /** User configuration for whether winner should be removed from name list */
  removeWinner?: boolean;
  /** User configuration for element selector which reel items should append to */
  reelContainerSelector: string;
  /** User configuration for callback function that runs before spinning reel */
  onSpinStart?: () => void;
  /** User configuration for callback function that runs after spinning reel */
  onSpinEnd?: () => void;

  /** User configuration for callback function that runs after user updates the name list */
  onNameListChanged?: () => void;
}

/** Class for doing random name pick and animation */
export default class Slot {
  /** List of names to draw from */
  private nameList: string[];

  /** Container that hold the reel items */
  private reelContainer: HTMLElement | null;

  /** Whether winner should be removed from name list */
  private shouldRemoveWinner: NonNullable<SlotConfigurations['removeWinner']>;

  /** Callback function that runs before spinning reel */
  private onSpinStart?: NonNullable<SlotConfigurations['onSpinStart']>;

  /** Callback function that runs after spinning reel */
  private onSpinEnd?: NonNullable<SlotConfigurations['onSpinEnd']>;

  /** Callback function that runs after spinning reel */
  private onNameListChanged?: NonNullable<SlotConfigurations['onNameListChanged']>;

  /**
   * Constructor of Slot
   * @param removeWinner  Whether winner should be removed from name list
   * @param reelContainerSelector  The element ID of reel items to be appended
   * @param onSpinStart  Callback function that runs before spinning reel
   * @param onNameListChanged  Callback function that runs when user updates the name list
   */
  constructor(
    {
      removeWinner = true,
      reelContainerSelector,
      onSpinStart,
      onSpinEnd,
      onNameListChanged
    }: SlotConfigurations
  ) {
    this.nameList = [];
    this.reelContainer = document.querySelector(reelContainerSelector);
    this.shouldRemoveWinner = removeWinner;
    this.onSpinStart = onSpinStart;
    this.onSpinEnd = onSpinEnd;
    this.onNameListChanged = onNameListChanged;
  }

  /**
   * Setter for name list
   * @param names  List of names to draw a winner from
   */
  set names(names: string[]) {
    this.nameList = names;

    const reelItemsToRemove = this.reelContainer?.children
      ? Array.from(this.reelContainer.children)
      : [];

    reelItemsToRemove
      .forEach((element) => element.remove());

    if (this.onNameListChanged) {
      this.onNameListChanged();
    }
  }

  /** Getter for name list */
  get names(): string[] {
    return this.nameList;
  }

  /**
   * Setter for shouldRemoveWinner
   * @param removeWinner  Whether the winner should be removed from name list
   */
  set shouldRemoveWinnerFromNameList(removeWinner: boolean) {
    this.shouldRemoveWinner = removeWinner;
  }

  /** Getter for shouldRemoveWinner */
  get shouldRemoveWinnerFromNameList(): boolean {
    return this.shouldRemoveWinner;
  }

  /**
   * Returns a new array where the items are shuffled
   * @template T  Type of items inside the array to be shuffled
   * @param array  The array to be shuffled
   * @returns The shuffled array
   */
  private static shuffleNames<T = unknown>(array: T[]): T[] {
    const keys = Object.keys(array) as unknown[] as number[];
    const result: T[] = [];
    for (let k = 0, n = keys.length; k < array.length && n > 0; k += 1) {
      // eslint-disable-next-line no-bitwise
      const i = Math.random() * n | 0;
      const key = keys[i];
      result.push(array[key]);
      n -= 1;
      const tmp = keys[n];
      keys[n] = key;
      keys[i] = tmp;
    }
    return result;
  }

  /**
   * Function for spinning the slot
   * @returns Whether the spin is completed successfully
   */
  public async spin(): Promise<boolean> {
    if (!this.nameList.length) {
      console.error('Name List is empty. Cannot start spinning.');
      return false;
    }

    if (this.onSpinStart) {
      this.onSpinStart();
    }

    const { reelContainer, shouldRemoveWinner } = this;
    if (!reelContainer) {
      return false;
    }

    const REEL_ITEM_HEIGHT_IN_PX = 7.5 * 16;
    const TOTAL_SPIN_DURATION_IN_MS = 12000;
    const FINAL_SLOWDOWN_DURATION_IN_MS = 5000;
    const FINAL_SLOWDOWN_ITEM_COUNT = 3;
    const FAST_PHASE_RATIO = (TOTAL_SPIN_DURATION_IN_MS - FINAL_SLOWDOWN_DURATION_IN_MS)
      / TOTAL_SPIN_DURATION_IN_MS;

    // Shuffle names and create reel items
    const randomNames = Slot.shuffleNames<string>(this.nameList);
    reelContainer.innerHTML = '';

    const fragment = document.createDocumentFragment();

    randomNames.forEach((name) => {
      const newReelItem = document.createElement('div');
      newReelItem.innerHTML = name;
      fragment.appendChild(newReelItem);
    });

    reelContainer.appendChild(fragment);
    const totalDistance = (randomNames.length - 1) * REEL_ITEM_HEIGHT_IN_PX;
    const fastPhaseItemCount = Math.max(0, randomNames.length - 1 - FINAL_SLOWDOWN_ITEM_COUNT);
    const fastPhaseDistance = fastPhaseItemCount * REEL_ITEM_HEIGHT_IN_PX;

    const reelAnimation = reelContainer.animate(
      [
        { offset: 0, transform: 'translateY(0)', filter: 'blur(1.5px)', easing: 'linear' },
        {
          offset: FAST_PHASE_RATIO,
          transform: `translateY(-${fastPhaseDistance}px)`,
          filter: 'blur(1px)',
          easing: 'cubic-bezier(0.12, 0.75, 0.2, 1)'
        },
        {
          offset: 1,
          transform: `translateY(-${totalDistance}px)`,
          filter: 'blur(0)'
        }
      ],
      {
        duration: TOTAL_SPIN_DURATION_IN_MS,
        iterations: 1
      }
    );

    console.info('Displayed items: ', randomNames);
    console.info('Winner: ', randomNames[randomNames.length - 1]);

    // Remove winner form name list if necessary
    if (shouldRemoveWinner) {
      this.nameList.splice(this.nameList.findIndex(
        (name) => name === randomNames[randomNames.length - 1]
      ), 1);
    }

    console.info('Remaining: ', this.nameList);

    // Play the spin animation
    const animationPromise = new Promise((resolve) => {
      reelAnimation.onfinish = resolve;
    });

    reelAnimation.play();

    await animationPromise;

    // Sets the current playback time to the end of the animation
    // Fix issue for animatin not playing after the initial play on Safari
    reelAnimation.finish();

    Array.from(reelContainer.children)
      .slice(0, reelContainer.children.length - 1)
      .forEach((element) => element.remove());

    if (this.onSpinEnd) {
      this.onSpinEnd();
    }
    return true;
  }
}
