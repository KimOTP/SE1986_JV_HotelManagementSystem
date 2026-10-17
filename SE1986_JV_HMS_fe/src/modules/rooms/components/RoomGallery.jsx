import { useState } from 'react';
import { FALLBACK_IMAGE } from '../constants/roomConstants';

export default function RoomGallery({ images = [], editable = false, onChange }) {
  const list = images.length ? images : [FALLBACK_IMAGE];
  const [selected, setSelected] = useState(0);
  const current = list[Math.min(selected, list.length - 1)] || FALLBACK_IMAGE;
  const fail = (e) => {
    e.currentTarget.src = FALLBACK_IMAGE;
  };
  const remove = (i) => {
    const next = images.filter((_, idx) => idx !== i);
    onChange?.(next);
    setSelected(0);
  };
  const makeCover = (i) => {
    const next = [images[i], ...images.filter((_, idx) => idx !== i)];
    onChange?.(next);
    setSelected(0);
  };
  return (
    <div className="room-gallery">
      <img src={current} onError={fail} className="room-gallery-main" alt="Ảnh phòng" />
      <div className="d-flex gap-2 mt-2 overflow-auto">
        {list.map((src, i) => (
          <div key={`${src}-${i}`}>
            <button
              type="button"
              className={`room-thumb ${i === selected ? 'active' : ''}`}
              onClick={() => setSelected(i)}
            >
              <img src={src} onError={fail} alt={`Ảnh ${i + 1}`} />
            </button>
            {editable && images.length > 0 && (
              <div className="d-flex gap-1 mt-1">
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0"
                  onClick={() => makeCover(i)}
                >
                  Đại diện
                </button>
                <button
                  type="button"
                  className="btn btn-link text-danger btn-sm p-0"
                  onClick={() => remove(i)}
                >
                  Xóa
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
