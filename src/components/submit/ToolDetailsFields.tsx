import { FIELD_INPUT_CLASS, LABEL_CLASS, type SubmitFormData } from './form';

export const TOOL_DETAIL_LISTS = [
  {
    key: 'useCases',
    label: 'Ideal use cases',
    placeholder: 'Who is this for, and what can they accomplish?',
  },
  {
    key: 'limitations',
    label: 'Known limitations',
    placeholder:
      'Limits, prerequisites, or situations where it is not suitable',
  },
  {
    key: 'examples',
    label: 'Usage examples',
    placeholder: 'A concrete task, input, and expected result',
  },
  {
    key: 'alternatives',
    label: 'Suggested alternatives',
    placeholder: 'Names of tools that solve a similar problem',
  },
] as const;

export function ToolDetailsFields({
  data,
  onChange,
}: {
  data: SubmitFormData;
  onChange: <K extends keyof SubmitFormData>(
    key: K,
    value: SubmitFormData[K]
  ) => void;
}) {
  return (
    <fieldset className='space-y-5 border-t border-gray-200 pt-5 dark:border-gray-700'>
      <legend className='px-2 text-lg font-semibold text-gray-900 dark:text-white'>
        Tool details
      </legend>
      <p className='text-sm text-gray-500'>
        Help visitors decide whether this tool fits their needs. Add details you
        can support; leave unknown information blank. Use one item per line (up
        to 20 items, 1,000 characters each).
      </p>
      {TOOL_DETAIL_LISTS.map(field => (
        <div key={field.key}>
          <label htmlFor={`tool-${field.key}`} className={LABEL_CLASS}>
            {field.label}
          </label>
          <textarea
            id={`tool-${field.key}`}
            rows={3}
            value={data[field.key]}
            onChange={event => onChange(field.key, event.target.value)}
            className={FIELD_INPUT_CLASS}
            placeholder={field.placeholder}
          />
        </div>
      ))}
      <div>
        <label htmlFor='tool-pricing-details' className={LABEL_CLASS}>
          Pricing details
        </label>
        <textarea
          id='tool-pricing-details'
          rows={3}
          maxLength={3000}
          value={data.pricingDetails}
          onChange={event => onChange('pricingDetails', event.target.value)}
          className={FIELD_INPUT_CLASS}
          placeholder='Include currency, billing period, and free-plan limits where known.'
        />
      </div>
      <div>
        <label htmlFor='tool-pricing-url' className={LABEL_CLASS}>
          Pricing source URL
        </label>
        <input
          id='tool-pricing-url'
          type='url'
          required={!!data.pricingCheckedAt}
          value={data.pricingUrl}
          onChange={event => onChange('pricingUrl', event.target.value)}
          className={FIELD_INPUT_CLASS}
          placeholder='https://example.com/pricing'
        />
      </div>
      <div>
        <label htmlFor='tool-pricing-date' className={LABEL_CLASS}>
          Date you checked pricing
        </label>
        <input
          id='tool-pricing-date'
          type='date'
          value={data.pricingCheckedAt}
          onChange={event => onChange('pricingCheckedAt', event.target.value)}
          className={FIELD_INPUT_CLASS}
        />
        <p className='mt-1 text-xs text-gray-500'>
          Only fill this in if you checked the linked pricing source on that
          date.
        </p>
      </div>
    </fieldset>
  );
}
