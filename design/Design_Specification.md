# Design specification: modular solar-assisted refrigeration plant

> **Basis.** Notional plant for the simulation case study in the accompanying paper (`paper/`). Rated performance figures are **computed from the model** (`svcr/`) at the stated duty points and are simulated, not measured. Dimensions, materials, ratings of protective devices and procedures are **design targets** chosen to be consistent with the model; they are not vendor data and must be re-derived against a real equipment selection and the applicable codes (e.g. EN 378, IEC 60364-7-712, local grid code) before any build.

> **Drawing scale.** The isometric drawing is schematic and not to scale. The model's lumped room parameters (below) correspond to a notional envelope of about 250 m², not the small box in the drawing.

## 0. System overview

| ID | Module | Page card | Function | Detach effect (model) |
|---|---|---|---|---|
| M1 | PV array | PV array | Generates DC power | Solar path lost: all energy from grid |
| M2 | Inverter | Inverter | DC to AC, MPPT, grid-code protection | Solar path lost (same as M1) |
| M3 | Compressor, motor | Compressor, motor, VFD | Raises refrigerant pressure, moves heat | Interlock open: no refrigeration |
| M4 | VFD and controls cabinet | Compressor, motor, VFD | Speed control, protection, dispatch logic | Treated with M3 (no drive, no cooling) |
| M5 | Condenser | Condenser + receiver | Rejects heat to ambient air | Interlock open: compressor cannot run |
| M6 | Receiver and valve train | Condenser + receiver | Liquid storage, expansion valves, gauges | Treated with M5 |
| M7 | Unit cooler (evaporator) | Evaporator | Cools room air | Room circuit unavailable; store circuit still runs |
| M8 | Ice-bank thermal store | Thermal store | Holds cold for later use | Store isolated: acts as solar-priority without store |
| M9 | Grid connection and meter | Grid connection | Import, export, metering, protection | Islanded: compressor runs only when PV covers it |
| M10 | Cold room | Cold room (fixed) | Envelope, product, thermal mass | Not detachable (it is the load) |


**Power path.** PV (M1) → DC combiner → inverter (M2) → AC bus ← grid (M9). The AC bus feeds the VFD cabinet (M4) which supplies the motor (M3) and the fans and pump. PV never drives the compressor directly.

**Refrigerant path.** Compressor (M3) → discharge line → condenser (M5) → receiver (M6) → liquid line → either expansion valve to the unit cooler (M7) or, through the store solenoid and valve, to the ice-bank coil (M8) → suction line → compressor. High side (red) is discharge, condenser and liquid line up to the valve; low side (blue) is everything after the valve.

**Operating modes.** Grid-dominant (fixed thermostat), solar-priority (variable speed follows PV), solar-priority with store. Equipment constraints common to all: minimum 10 min on and 10 min off, speed 0.3 to cap.

### 0.1 Design conditions and rated duty points (computed)

| Duty point | T_evap °C | T_cond °C | p_suction bar | p_discharge bar | ṁ g/s | Q̇_cool kW | W_shaft kW | P_el kW | Q̇_reject kW | COP | T_disch °C |
|---|---|---|---|---|---|---|---|---|---|---|---|
| A: room 2 °C, air 35 °C, 100 % speed | -5.1 | 43.8 | 2.42 | 11.3 | 100 | 14.2 | 5.22 | 6.36 | 19.4 | 2.23 | 61 |
| B: room 2 °C, air 30 °C, 50 % | -2.5 | 36.7 | 2.67 | 9.3 | 58 | 9.0 | 2.28 | 2.93 | 11.3 | 3.07 | 48 |
| C: store charge, air 35 °C, 100 % | -11.1 | 42.8 | 1.92 | 11.0 | 76 | 10.6 | 4.80 | 5.88 | 15.4 | 1.81 | 67 |
| D: store charge, air 35 °C, 50 % | -8.3 | 40.9 | 2.14 | 10.4 | 44 | 6.4 | 2.39 | 3.06 | 8.8 | 2.09 | 59 |
| E: room, air 10 °C, 40 % speed | -2.5 | 20.0 | 2.67 | 5.7 | 50 | 9.0 | 1.08 | 1.44 | 10.0 | 6.23 | 27 |


Over the full performance map, the highest discharge temperature is 127 °C and the highest discharge pressure 17.2 bar absolute. Condenser heat rejection equals cooling plus shaft work at every point (test `test_heat_rejection_equals_cooling_plus_compressor_work`).


## M1 PV array

**Function.** Converts irradiance to DC power. Flat-mounted canopy over the yard; 24 modules, two strings of 12.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| DC string 1 and 2 (+/-) | MC4-compatible, 2 pairs | 1000 V DC, 13 A | M2 DC inputs via combiner |
| Protective earth | M8 stud | 16 mm² Cu | Site earth bar |
| Structure | 4 posts, bolted base plates | M16 × 4 per post | Foundation |

**Rated data.**

| Item | Value |
|---|---|
| STC power | 12 kWp (24 × 500 Wp) |
| String voltage | Vmp about 12 × 41 V ≈ 490 V; Voc about 12 × 49 V ≈ 590 V at 25 °C |
| Power temperature coefficient | −0.40 %/K |
| Cell temperature | T_amb + 0.031 × G (NOCT-type) |
| Peak AC output (reference day) | 8.6 kW after inverter |
| Energy, reference clear-ish day | 55.8 kWh AC (seed 7, cloud factor included) |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Module | 2.28 × 1.13 m, 28 kg; array area about 62 m² |
| Canopy footprint (design) | 13.7 m × 4.6 m at 2.8 m clearance, flat (6 × 4 modules, landscape) |
| Total mass with frame | about 1.1 t |

**Materials and finish.** Anodised aluminium frames and rails, hot-dip galvanised steel posts, UV-stable double-insulated DC cable, glass 3.2 mm tempered.

**Control and protection.**

| Function | Setting |
|---|---|
| String protection | gPV fuse 15 A per string, DC isolator at the inverter |
| Insulation monitoring | In the inverter, alarm below 100 kΩ |
| Lightning | Bonding of frames, SPD type 2 on DC side |

**Detach and re-attach.**

1. Open DC isolator and AC supply to the inverter, wait 5 min, verify zero volts at the combiner.
2. Disconnect the two MC4 pairs, label polarity and string number.
3. Lift the array off its posts if repairing the canopy (not needed for module swaps).
4. To re-attach: bolt, reconnect strings, megger test (≥ 1 MΩ at 1000 V), measure Voc per string against 590 V ± 5 %, close the isolator, then Arm.

**Maintenance.** Clean twice a year, thermographic scan yearly, torque check M16 yearly, IV-curve test every 2 years.

**Model mapping.** `P_pv_kwp` (2 to 30 kWp). Detach or disarm sets generation to zero. `pvdc()` and Python `pv_dc()` are the same equation.


## M2 Inverter

**Function.** Grid-tied string inverter with MPPT; feeds the AC bus. No battery, no islanding capability.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| DC input | 2 MPPT, 4 pairs MC4 | 1000 V, 2 × 13 A | M1 |
| AC output | 3-phase + N + PE, 400 V | 16 A per phase | AC bus in M9 |
| Comms | RS-485 Modbus | 9600 baud | M4 / data logger |

**Rated data.**

| Item | Value |
|---|---|
| AC rating | 10 kW |
| DC/AC ratio | 1.20 |
| Efficiency at 10 / 20 / 50 / 80 / 100 % of rating (model) | 87.8 % / 92.5 % / 94.8 % / 94.8 % / 94.5 % |
| Clipping | Output capped at the AC rating |
| Loss model | 0.01 P_r + 0.02 P_dc + 0.025 P_dc²/P_r |
| Night tare | 0.03 kW, included in controls load |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Enclosure | IP65, 0.55 × 0.42 × 0.20 m, 22 kg |
| Mounting | Wall or post, 4 × M8 |

**Materials and finish.** Die-cast aluminium body with passive heat-sink fins, front display.

**Control and protection.**

| Function | Setting |
|---|---|
| Grid protection | Over/under voltage and frequency, anti-islanding (loss of mains within 2 s) |
| Reconnection | 60 s after grid returns |
| Over-temperature | Derates above 60 °C heat-sink temperature |

**Detach and re-attach.**

1. Switch off AC breaker, then DC isolator; wait 5 min for capacitors.
2. Disconnect MC4, AC plug-in connector and Modbus cable.
3. Remove the 4 × M8 bolts.
4. To re-attach: bolt, connect AC, then DC, set grid-code profile, check insulation resistance, Arm. A new unit must be commissioned with its rating entered in the card before Arm.

**Maintenance.** Fan-less. Inspect heat-sink dust yearly, firmware update, check 3-phase balance.

**Model mapping.** `P_inv` (3 to 20 kW). Interface check warns if DC/AC ratio is outside 0.9 to 1.5.


## M3 Compressor and motor

**Function.** Open-drive reciprocating R134a compressor driven by an induction motor through a flexible coupling. Speed 0.3 to 1.0 of 50 Hz.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Suction | Flanged, DN32 | 12 bar(g) design | M5/M7 suction line |
| Discharge | Flanged, DN25 | 20 bar(g) design | M5 inlet |
| Motor power | Terminal box, 3 × 400 V | 7.5 kW IE3, 15 A | M4 VFD output |
| Oil and cooling | Sight glass, crankcase heater | 150 W heater | M4 |

**Rated data.**

| Item | Value |
|---|---|
| Swept volume at 100 % | 37.8 m³/h |
| Clearance volume | 6 % |
| Isentropic efficiency | 0.80 − 0.045 (PR − 1), clamped 0.5 to 0.8; at duty A: 0.64 |
| Mechanical / drive efficiency | 0.93 / 0.97 |
| Motor efficiency | 0.92 − 0.12 (1 − x)², x = shaft load / 7.5 kW |
| Rated duty A | 14.2 kW cooling at 6.36 kW electric, COP 2.23 |
| Maximum discharge temperature in map | 127 °C (trip 135 °C) |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Skid | 1.9 × 0.7 × 0.9 m, about 380 kg (motor 55 kg, compressor 140 kg, base and guard) |
| Mounting | 4 × M12 on anti-vibration mounts; coupling alignment ±0.05 mm |

**Materials and finish.** Cast-iron crankcase and cylinder block, steel crankshaft, aluminium cylinder head, epoxy-coated skid, stainless coupling guard.

**Control and protection.**

| Function | Setting |
|---|---|
| Minimum on/off | 10 min / 10 min |
| High-pressure cut-out | 17.5 bar(g), manual reset |
| Low-pressure cut-out | 0.3 bar(g), auto reset |
| Discharge temperature trip | 135 °C |
| Motor overload | Thermistor + VFD current limit 110 % |
| Speed range | 15 to 50 Hz (0.3 to 1.0); `cap` limits the maximum |
| Interlock | Runs only if condenser fan available and receiver and valve train attached |

**Detach and re-attach.**

1. Press Disarm on the card: the model removes the compressor from dispatch (lock-out).
2. Electrically isolate at the VFD, apply padlock and tag, verify zero energy.
3. Recover refrigerant to the receiver by pump-down to 0.1 bar(g) (or recover to a cylinder), close suction and discharge service valves.
4. Disconnect motor cables, unbolt the two flanges, lift the skid with 4-point sling.
5. To re-attach: new gaskets, torque flanges (M12 ≈ 55 N·m), evacuate to 0.5 mbar, leak test with nitrogen at 20 bar, re-charge, check motor rotation and coupling alignment, edit parameters if the unit is different, then Arm. Interface checks run: shaft power vs motor rating, heat rejection vs condenser rating.

**Maintenance.** Oil change every 5000 h, valve plate inspection every 15000 h, vibration check quarterly, alignment yearly.

**Model mapping.** `swept` (15 to 80 m³/h), `motor_rated` (3 to 15 kW), `eta_is0`, `clearance`, min on/off time. Changing these rebuilds the performance map in the browser (JS port of `cycle.py`, agreement with Python 5e-5 relative).


## M4 VFD and controls cabinet

**Function.** Variable-frequency drive, I/O, safety chain and the dispatch logic that implements the three policies.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Mains in | 3-phase 400 V | 16 A, 3-pole MCCB | AC bus |
| Motor out | 3-phase, screened | 7.5 kW | M3 |
| Sensors | Pt1000 × 4, pressure 4–20 mA × 2 | room, evaporator, condenser, discharge; suction, discharge | M3, M5, M7 |
| Outputs | Relay and 0–10 V | fan speed, valves, pump | M5, M7, M8 |
| Data | Modbus RTU | inverter and meter | M2, M9 |

**Rated data.**

| Item | Value |
|---|---|
| VFD rating | 7.5 kW, efficiency 0.97 |
| Controls load | 0.12 kW continuous (includes inverter tare) |
| Time step in model | 120 s |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Cabinet | 0.8 × 0.5 × 1.2 m, IP54, 90 kg |

**Materials and finish.** Powder-coated steel, thermostatically controlled ventilation fan.

**Control and protection.**

| Function | Setting |
|---|---|
| Policy | Selected by mode: fixed, solar-priority, solar-priority with store |
| Setpoint | 2 °C, band 1 to 3 °C (fixed policy) |
| Product limit | 4 °C; alarm above |
| Pre-cool floor | 0.5 °C |
| Speed from PV | Highest speed in {0.3,…,1.0} whose total draw fits the PV output |
| Grid-backed recovery | 60 % speed from 3.4 °C, 100 % from 3.8 °C |

**Detach and re-attach.**

1. Open the MCCB and lock out.
2. Disconnect motor, sensor and Modbus plugs (all keyed and labelled).
3. To re-attach: reconnect, load the parameter set, verify sensor readings against a reference thermometer (±0.3 K), run motor rotation check at 15 Hz, Arm.

**Maintenance.** Dust filter monthly, capacitor check every 5 years, parameter backup after every change.

**Model mapping.** Grouped with M3 on the page. The decision logic is `decide()` in `plant.py`, ported 1:1 to `sim.js`.


## M5 Condenser

**Function.** Air-cooled finned coil with an EC axial fan; rejects compressor heat to ambient.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Inlet | Brazed, 22 mm | 20 bar(g) | M3 discharge |
| Outlet | Brazed, 16 mm | 20 bar(g) | M6 receiver |
| Fan power | 230 V, 0–10 V | 0.9 kW | M4 |

**Rated data.**

| Item | Value |
|---|---|
| Rated heat rejection | 19 kW |
| UA at full fan | 2.2 kW/K; UA = UA₀ f^0.5, f = fan fraction |
| Fan power | P = 0.9 f³, f from 0.35 to 1 |
| Minimum condensing | 20 °C (head-pressure control) |
| Duty A | T_cond 43.8 °C, p 11.3 bar, rejects 19.4 kW, fan 0.90 kW |
| Duty E (air 10 °C) | T_cond 20.0 °C, fan 0.13 kW |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Unit | 2.5 × 1.2 × 0.8 m plus 0.35 m fan shroud, 160 kg, on 0.8 m legs |
| Clearances | 1.0 m air inlet sides, 2.0 m above fan |

**Materials and finish.** Copper tubes, aluminium fins with blue-fin coating, galvanised casing, composite fan blades.

**Control and protection.**

| Function | Setting |
|---|---|
| Head-pressure control | Fan speed from condensing pressure |
| High-pressure cut-out | 17.5 bar(g) |
| Fan fault | Compressor stop |

**Detach and re-attach.**

1. Disarm the card; the compressor interlock opens.
2. Isolate and lock out fan supply.
3. Pump down into the receiver, close inlet and outlet valves, recover residual charge.
4. Cut and cap the two brazed joints or use flare couplings if fitted; lift unit with 4 lugs.
5. To re-attach: braze under nitrogen purge, pressure test 22 bar(g), evacuate, release charge, set fan parameters, Arm. Interface check: rated rejection must exceed the compressor's rejection at design duty by at least 10 %.

**Maintenance.** Coil wash quarterly, fan bearing check yearly, leak check yearly (EN 378).

**Model mapping.** `UA_cond0`, `Qc_rated`, `fan_cond`. The page warns when heat rejection at duty A exceeds `Qc_rated` by more than 10 %.


## M6 Receiver and valve train

**Function.** Liquid receiver, liquid-line components and the two expansion valves that define the high/low pressure boundary.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Condenser inlet | Brazed 16 mm | 20 bar(g) | M5 |
| Liquid outlet | Ball valve, 16 mm | 20 bar(g) | M7, M8 liquid lines |
| Gauge board | 2 dial gauges | LP 0 to 6 bar, HP 0 to 20 bar | Suction and discharge taps |

**Rated data.**

| Item | Value |
|---|---|
| Receiver volume | 30 L, holds about 125 % of the estimated charge |
| Estimated charge | 0.45 kg per kW of maximum cooling, about 6.4 kg at duty A |
| Expansion valves | Thermostatic with 5 K superheat; room valve and store valve with solenoid |
| Subcooling | 3 K |
| Isenthalpic expansion | h₄ = h₃ |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Receiver | Ø 0.40 × 0.64 m vertical, 35 kg |
| Valve train | Compact panel 0.5 × 0.3 m |

**Materials and finish.** Carbon-steel shell, sight glass, relief valve, stainless gauge case.

**Control and protection.**

| Function | Setting |
|---|---|
| Pressure relief | 21 bar(g) on the receiver |
| Liquid solenoid | Closes on stop and on fault |
| Gauge isolation | Needle valves |

**Detach and re-attach.**

1. Same pump-down as M5 (they share the liquid line); treated together on the page.
2. To re-attach: braze, nitrogen test 22 bar(g), evacuate, charge by weight, check subcooling and superheat at duty A.

**Maintenance.** Relief valve replacement every 5 years per local code, sight-glass moisture check monthly.

**Model mapping.** `recv_l` is stored for the interface check. Cycle state 4 is shown on the live p–h diagram; the gauges are driven by the model's displayed saturation pressures.


## M7 Unit cooler (evaporator)

**Function.** Direct-expansion coil and fans that cool the room air.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Liquid inlet | Flare 12 mm | 20 bar(g) | M6 valve |
| Suction outlet | Flare 22 mm | 12 bar(g) | M3 suction line |
| Fan power | 230 V | 0.25 kW | M4 |

**Rated data.**

| Item | Value |
|---|---|
| Coil UA | 2.0 kW/K |
| Duty A | T_evap -5.1 °C, ΔT to room 7.1 K, p 2.42 bar |
| Fan heat | 0.25 kW, added to the room load while running |
| Defrost | Not modelled |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Unit | 0.7 × 0.3 × 0.35 m (drawing) / 1.4 × 0.6 × 0.5 m (design), 45 kg on floor stand |

**Materials and finish.** Aluminium fins 4.5 mm pitch, copper tubes, ABS drain pan, EC fans.

**Control and protection.**

| Function | Setting |
|---|---|
| Superheat | 5 K |
| Fan | Runs when the room circuit or store discharge is active |

**Detach and re-attach.**

1. Disarm the card; the room circuit is removed, the store circuit can still run.
2. Close the liquid valve, pump down, isolate fan.
3. Unflare the two connections, unclip drain, lift off.
4. To re-attach: re-flare, leak test, evacuate, open valves, check drain, Arm.

**Maintenance.** Coil clean quarterly, drain heater test before winter.

**Model mapping.** `UA_chamber` and `P_evfan`.


## M8 Ice-bank thermal store

**Function.** Eutectic brine freezes on a coil bank when PV is in surplus and holds cold for the night.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Liquid feed | Flare 12 mm via solenoid and valve | 20 bar(g) | M6 |
| Suction return | Flare 22 mm via header | 12 bar(g) | M3 suction line |
| Pump | 230 V | 0.20 kW | M4 |

**Rated data.**

| Item | Value |
|---|---|
| Capacity | 30 kWh_th (0 to 80 by slider), latent, 415 kg of phase-change medium at 260 kJ/kg |
| Melt point | -4 °C |
| Charging | UA 1.5 kW/K; duty C: T_evap -11.1 °C, 10.6 kW, COP 1.81; duty D: 6.4 kW, COP 2.09 |
| Discharge | up to 8 kW, proportional to (T_room − 2)/1.5 K |
| Standing loss | UA 0.012 kW/K, about 0.07 kW at 6 K |
| Charge coils | 6 vertical tubes, ice cylinders grow with state of charge |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Tank | 1.2 × 1.0 × 1.2 m insulated, about 1.5 m³, 250 kg empty |

**Materials and finish.** Polyethylene tank with 100 mm PUR insulation, copper coil, brine with corrosion inhibitor.

**Control and protection.**

| Function | Setting |
|---|---|
| Charge command | Only from PV surplus with the room already below 3 °C (or room coil out of service) |
| Grid compressor start | Only if the bank is empty and the room is at 3.4 °C or above |
| Overfill guard | Stop at 98 % charge |

**Detach and re-attach.**

1. Disarm: dispatch stops using the store; its charge is held.
2. Close liquid and suction valves, recover refrigerant from the coil, drain brine.
3. Unflare, lift tank.
4. To re-attach: refill brine, leak test coil at 20 bar(g), evacuate, open valves, edit capacity, Arm. State of charge starts at the slider value.

**Maintenance.** Brine concentration yearly, tank insulation check, coil leak test every 3 years.

**Model mapping.** `store_kwh` (slider, 0 to 80), `T_pcm`, `Q_dis_max`, `UA_store`. Store balance verified by `test_store_energy_balance` to 1e-6.


## M9 Grid connection and meter

**Function.** Bidirectional metering and protection at the point of common coupling.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Supply | 3-phase 400 V, 32 A | 22 kVA | Utility |
| AC bus | Busbar 63 A |  | M2, M4 |
| Meter | Bidirectional, pulse + Modbus | Class 1 | M4 |

**Rated data.**

| Item | Value |
|---|---|
| Import tariff | $0.10/kWh 22:00–06:00, $0.16 shoulder, $0.30 17:00–21:00 |
| Export price | $0.04/kWh |
| Peak import observed in study | 3.9 to 7.5 kW depending on controller |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Cabinet | 0.5 × 0.4 × 1.0 m, pole-mounted, 45 kg |

**Materials and finish.** Galvanised steel, IP54.

**Control and protection.**

| Function | Setting |
|---|---|
| Over-current | 3 × 32 A MCB, 30 mA RCD |
| Anti-islanding | In the inverter |
| Surge | SPD type 1+2 |

**Detach and re-attach.**

1. Notify the utility for any change at the point of common coupling.
2. Open the main breaker and lock out.
3. In the model, disarm means the grid is open: the plant is islanded and any load not covered by PV is reported as unserved.
4. To re-attach: utility reconnection, phase rotation check, Arm.

**Maintenance.** Meter calibration per utility, thermal scan yearly.

**Model mapping.** `price_export`. Islanded runs are verified by `test_detached_modules` and the `sc_island` parity scenario.


## M10 Cold room

**Function.** Insulated room holding product at 2 °C (limit 4 °C). It is the thermal load and the plant's thermal flywheel.

**Interfaces.**

| Port | Type | Size / rating | Mates with |
|---|---|---|---|
| Refrigerant pipe penetrations | 2 × sealed sleeves |  | M7 |
| Door | Cold-store sliding door |  | Operator |

**Rated data.**

| Item | Value |
|---|---|
| Effective thermal mass C_s | 9000 kJ/K, about 2.5 t of product plus air and racking (a modelling assumption) |
| Envelope UA | 0.10 kW/K, about 0.4 W/m²K over a notional 250 m² including door and infiltration |
| Process load | 1.0 kW base, up to about 8 kW with handling pulses 07:00–17:00 (scaled by the demand slider) |
| Time constant with no cooling | 25 h (matches the analytic test) |

**Dimensions and mass (nominal design target).**

| Item | Value |
|---|---|
| Drawing | 3.3 × 3.3 × 1.8 m cut-away (schematic) |

**Materials and finish.** Insulated sandwich panels, 100 mm PUR, stainless inner skin, anti-slip floor.

**Control and protection.**

| Function | Setting |
|---|---|
| Setpoint | 2 °C |
| Product limit | 4 °C |
| Pre-cool floor | 0.5 °C |

**Detach and re-attach.**

1. The room is fixed in the model. Specifications may be edited at any time (no lock-out).

**Maintenance.** Door seal and heater check monthly, panel joints yearly.

**Model mapping.** `C_s`, `UA_env`, `T_set`, plus the cooling-demand slider.


## 11. Interface matrix and checks

| Interface | Check run on Arm | Default result |
|---|---|---|
| M3 ↔ M4 | Shaft power at duty A ≤ 1.05 × motor rating | 5.22 kW ≤ 7.9 kW: pass |
| M3 ↔ M5 | Heat rejection at duty A ≤ 1.10 × condenser rating | 19.4 kW ≤ 20.9 kW: pass |
| M1 ↔ M2 | DC/AC ratio between 0.9 and 1.5 | 1.20: pass |
| M3 ↔ M5/M6 | Interlock: compressor runs only with condenser and valve train armed | enforced in the model |
| M8 ↔ M7 | Store can charge with the room coil out | enforced (`m_evap`) |


## 12. Lock-out and exchange procedure (applies to every module)

1. **Disarm** on the page (the model removes the module from dispatch; the scene shows LOCKED OUT).
2. Isolate electrical and refrigerant energy, lock and tag, verify zero.
3. **Detach** (the scene lifts the module and shows its socket).
4. Make physical or specification changes. Specification fields on the card are editable only while the module is not armed.
5. **Attach** returns it to the socket, still locked out.
6. **Arm** applies the edited specification, rebuilds the performance map if cycle parameters changed, runs the interface checks and returns the module to service.

## 13. Verification and traceability

| Claim | Evidence |
|---|---|
| Heat rejection = cooling + shaft work | `test_heat_rejection_equals_cooling_plus_compressor_work` |
| Room and store energy balances close | `test_room_energy_balance_closes`, `test_store_energy_balance` (1e-6) |
| Electrical balance closes | `test_electrical_accounting` |
| Detached-module behaviour | `test_detached_modules`, parity scenarios island, no_store, no_cond, no_evap, no_inv |
| Browser equals Python | `web/parity.mjs` (≤ 2e-4) and JS-built map vs Python map (5e-5) |
| Everything is simulated | No test compares against measured plant data |
