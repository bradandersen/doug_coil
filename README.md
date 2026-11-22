# Doug Coil Calculator

A spreadsheet that finds the capacitance to resonate a Doug coil at a chosen frequency, then tells you which capacitor switches to turn on.

Capacitance is in microfarads. `L` is the coil in millihenries, and `f` is the frequency in hertz:

```
C = 10^9 / ((2 * π * f)^2 * L)
```

The workbook has three sheets: **Switch Calculator**, **Coil Calculator**, and **How To**. The same calculation is also a web page, [index.html](index.html), ready for GitHub Pages: [bradandersen.github.io/doug_coil](https://bradandersen.github.io/doug_coil/).

Enter the coil in millihenries and the frequency. The page names the switches to turn on, lists the frequency table, and keeps your capacitor measurements in the browser. Switch M starts at 0.022 µF. Each bank row shows the sum of the switches after it.

## Measure each capacitor

Measure every capacitor with a digital multimeter. You may need to disconnect a wire from the connection to the coil so the meter reads that capacitor alone.

Enter those measurements in the capacitor row on **Switch Calculator** (switches B through P). The numbers already in the sheet are one machine's readings. Replace them with yours.

Do this quarterly. Capacitance fades with usage, and every switch choice in the table depends on these values.

## Each switch is a summary of the switches after it

**Each switch is just a summary of all the switches that follow it.** Its capacitance is about equal to the sum of every smaller capacitor.

That is base-X. The place value of a switch is its measured capacitance, and the step from one switch to the next is the base. Where that step is about 2, turning one switch on is the same capacitance as turning on every switch below it. The sheet uses that fact: it walks from the largest switch to the smallest, turns a switch on when the capacitance still needed is greater than that switch, and subtracts it.

On the sample bank, with switch M at 0.022 µF, switch C is 16.07 µF and the switches after it add up to 16.01 µF. Switch D is 8.02 µF and the switches after it add up to 7.99 µF. The same check runs down the row. After you enter new measurements, a switch that no longer matches the sum of the switches after it needs another look.

## Switch Calculator

1. Enter the coil size in millihenries (cell B1). The sample coil is 8.81 mH.
2. Enter the measured capacitor values for switches B through P.
3. Read the row for the frequency you want. The table runs from 230 Hz to 3500 Hz in 5 Hz steps.

Each row shows:

- **Capacitance needed** — the value that resonates the coil at that frequency
- **Capacitance available** — what the chosen switches add up to
- **% Difference** — how far the bank misses the needed value
- **Switches** — which letters to turn on

Driving the coil to 1.5 V or 15 A with a % Difference greater than 0.6 heats the capacitor, the amp, and the coil. The How To sheet notes that 1.3 V or 13 A runs cooler and lasts longer.

## Coil Calculator

Use this sheet to find the coil size in millihenries from one known capacitor.

1. Turn on a single capacitor, such as the 4 µF on switch E.
2. Set the frequency near 840 Hz for that switch.
3. Turn the output up to about 0.5 V.
4. Move the frequency until the voltage reaches a maximum.
5. Fine-tune by tenths of a hertz to the absolute peak.
6. Enter the actual capacitance.
7. Enter the frequency where the voltage peaked.

The sheet solves this and gives the coil size in millihenries. Put that number in B1 on the Switch Calculator.

```
L = 10^9 / (C * (2 * π * f)^2)
```
