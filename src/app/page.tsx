import JsonSchemaBuilder from '@/components/JsonSchemaBuilder';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mt-8">
          <JsonSchemaBuilder />
        </div>
      </div>
    </div>
  );
}
