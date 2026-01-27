import React, { useState } from 'react';
import './AppointmentsModal.css';

export const TIME_SLOTS = [
    "08:30", "09:45", "11:00", "13:00", 
    "14:30", "15:45", "17:00",
];

const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
};

const formatDateLocal = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const CalendarView = ({ selectedDate, onDateSelect, bookedTimes = [], loading = false, onSlotSelect, selectedSlot }) => {
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth());
    const [currentYear, setCurrentYear] = useState(today.getFullYear());

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); 
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDay = (firstDayOfMonth + 6) % 7; 

    const dateCells = [];
    for (let i = 0; i < startDay; i++) {
        dateCells.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(currentYear, currentMonth, day);
        const dateString = formatDateLocal(date);
        const todayString = formatDateLocal(today);
        const isToday = dateString === todayString;
        const isSelected = dateString === selectedDate;

        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (isSelected) dayClass += ' selected';

        dateCells.push(
            <div 
                key={day} 
                className={dayClass}
                onClick={() => onDateSelect && onDateSelect(dateString)}
            >
                {day}
            </div>
        );
    }

    const monthName = new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long' });

    const changeMonth = (delta) => {
        let newMonth = currentMonth + delta;
        let newYear = currentYear;
        if (newMonth > 11) { newMonth = 0; newYear += 1; }
        else if (newMonth < 0) { newMonth = 11; newYear -= 1; }
        setCurrentMonth(newMonth);
        setCurrentYear(newYear);
        const newDate = new Date(newYear, newMonth, 1);
        onDateSelect && onDateSelect(formatDateLocal(newDate));
    };

    return (
        <div className="calendar-container">
            <div className="calendar-header">
                <button onClick={() => changeMonth(-1)} className="nav-btn">{"<"}</button>
                <h3>{monthName} {currentYear}</h3>
                <button onClick={() => changeMonth(1)} className="nav-btn">{" >"}</button>
            </div>

            <div className="calendar-grid">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                    <div key={d} className="calendar-weekday">{d}</div>
                ))}
                {dateCells}
            </div>

            <div className="time-slots-view">
                <h4 className="time-slots-header">Slots for {selectedDate}</h4>
                {loading ? (
                    <p className="loading-text">Loading...</p>
                ) : (
                    <div className="slots-grid">
                        {TIME_SLOTS.map(slot => {
                            const isBooked = bookedTimes.includes(slot);
                            const isSelected = selectedSlot === slot;
                            const cls = `time-slot ${isBooked ? 'booked' : 'available'} ${isSelected ? 'selected-slot' : ''}`;
                            return (
                                onSlotSelect ? (
                                    <button key={slot} className={cls} disabled={isBooked} onClick={() => onSlotSelect(slot)} title={isBooked ? 'Booked' : 'Select'}>
                                        {slot}
                                    </button>
                                ) : (
                                    <span key={slot} className={cls} title={isBooked ? 'Booked' : 'Available'}>
                                        {slot}
                                    </span>
                                )
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CalendarView;
