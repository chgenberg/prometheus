// Since we're fetching data from a database, we need to define the shape of that data.
// We can create a type for the Hand object.
type Hand = {
  hand_id: string;
  situation_string: string;
  played_date: string;
  num_players: number;
};

export default function HandsTable({ hands }: { hands: Hand[] }) {
  return (
    <div className="mt-6 flow-root">
      <div className="inline-block min-w-full align-middle">
        <div className="rounded-lg bg-gray-800 p-2 md:pt-0">
          <table className="min-w-full text-gray-300">
            <thead className="rounded-lg text-left text-sm font-normal">
              <tr>
                <th scope="col" className="px-4 py-5 font-medium sm:pl-6">
                  Hand ID
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Situation
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Date
                </th>
                <th scope="col" className="px-3 py-5 font-medium">
                  Players
                </th>
              </tr>
            </thead>
            <tbody className="bg-gray-900">
              {hands?.map((hand) => (
                <tr
                  key={hand.hand_id}
                  className="w-full border-b py-3 text-sm last-of-type:border-none [&:first-child>td:first-child]:rounded-tl-lg [&:first-child>td:last-child]:rounded-tr-lg [&:last-child>td:first-child]:rounded-bl-lg [&:last-child>td:last-child]:rounded-br-lg"
                >
                  <td className="whitespace-nowrap py-3 pl-6 pr-3">
                    {hand.hand_id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 truncate max-w-sm">
                    {hand.situation_string}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {hand.played_date}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3">
                    {hand.num_players}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 