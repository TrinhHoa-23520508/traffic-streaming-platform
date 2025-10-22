
export default function Card({title, description}:any) {
    return (
        <div className="border rounded-lg p-4 shadow-md w-60">
            <h2 className="text-lg font-semibold text-black">{title}</h2>
            <p className="text-gray-600">{description}</p>
        </div>
    );
}